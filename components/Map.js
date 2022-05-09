import styles from '../styles/Map.module.css'
import { useEffect, useRef, useState, createRef } from 'react';
import React from 'react'
import Entity from './Entity'
import Tooltip from './Tooltip'
import Preload from './Preload'
import useSound from 'use-sound';

// import Audio from '../components/Audio'
import world from '../sounds/world.mp3';
import fight from '../sounds/fight.mp3';
import receiveDamage from '../sounds/rcvDmg.mp3';
import deliverDamage from '../sounds/dlvrDmg.mp3';

import {
    BiRightArrow,
    BiLeftArrow,
    BiDownArrow,
    BiUpArrow
} from "react-icons/bi"

function getMapPointFromCellId(e) {
    var t = e % 14 - ~~(e / 28),
        i = t + 19,
        n = t + ~~(e / 14);
    return {
        x: i,
        y: n
    }
}


function getCellDistance(e, t) {
    var i = getMapPointFromCellId(e),
        n = getMapPointFromCellId(t),
        o = Math.abs(i.x - n.x) + Math.abs(i.y - n.y);
    return o
}

function distance(a, b) {
    return Math.abs(Math.sqrt(Math.pow(b.y - a.y, 2) + Math.pow(b.x - a.x, 2)))
}

const MapGrid = (props) => {
    var { mapData, mainHeight, mainWidth } = props;
    if (!mapData) mapData = { cells: {} }

    const [entities, setEntities] = useState([])
    const [clickedSpell, setClickedSpell] = useState({
        id: -1,
        range: [],
        los: []
    })
    const [tooltip, setTooltip] = useState({ content: "", pos: { x: 0, y: 0 }, entities: [{ name: "", level: -1 }], entity: { name: "", hp: 0 } })

    const [loading, setLoading] = useState(true);
    const [percentage, setPercentage] = useState(0);

    const [playWorldFunction, { stop: stopWorldFunction }] = useSound(
        world,
        {
            volume: 0.5,
            onend: () => {
                stopWorld();
                playWorld();
            }
        }
    );

    const playWorld = () => {
        if (socket.player.worldPlaying) return;
        playWorldFunction()
        socket.player.worldPlaying = true
    }

    const stopWorld = () => {
        stopWorldFunction()
        socket.player.worldPlaying = false;
    }

    const [playFight, { stop: stopFight }] = useSound(
        fight,
        {
            volume: 0.5,
            onend: () => {
                playFight();
            }
        }
    );
    const [playDDmg] = useSound(
        deliverDamage,
        { volume: 4 }
    );
    const [playRDmg] = useSound(
        receiveDamage,
        { volume: 4 }
    );

    const staticRef = useRef()
    const gridRef = useRef()
    const containerRef = useRef()
    const entitiesRef = useRef({})

    const changeLeft = useRef()
    const changeRight = useRef()
    const changeTop = useRef()
    const changeBottom = useRef()

    var timeout;

    /** Callbacks **/
    const cb = payload => {
        if (!entitiesRef.current[payload.data.entityId]) return;
        clearTimeout(timeout)
        setTooltip({
            content: payload.data.content,
            pos: {
                x: entitiesRef.current[payload.data.entityId].state.x + entitiesRef.current[payload.data.entityId].width / 2,
                y: entitiesRef.current[payload.data.entityId].state.y - entitiesRef.current[payload.data.entityId].height,
            },
            entities: []
        })

        timeout = setTimeout(() => {
            setTooltip({ content: "", pos: { x: 0, y: 0 }, entities: [{ name: "", level: -1 }] })
        }, 2000)
    }
    const FightAddFighter = payload => {
        payload.data.player = payload.data.teamId == 0
        payload.data.me = socket.player.entityId == payload.data.entityId
        addEntity(payload.data)
    }
    const FightSyncMessage = payload => {
        const data = payload.data;
        setEntities(e => [])
        for (const id in data.fighters) {
            socket.player.Fighters[id] = data.fighters[id]
            data.fighters[id].player = data.fighters[id].teamId == 0
            data.fighters[id].me = socket.player.entityId == data.fighters[id].entityId
            addEntity(data.fighters[id])
        }
    }
    const LifePointsVariation = payload => {
        socket.player.Fighters[payload.data.entityId].stats.lifePoints += payload.data.delta
        if (payload.data.delta < 0) socket.player.entityId == payload.data.entityId ? playRDmg() : playDDmg()
        if (payload.data.entityId == socket.player.entityId) {
            socket.eventEmitter.emit("CharacterStatsList", {
                data: { stats: socket.player.Fighters[payload.data.entityId].stats }
            })
        }
    }
    const FightDeathMessage = payload => {
        delete socket.player.Fighters[payload.data.entityId]
        setEntities(entities => entities.filter(e => e.entityId != payload.data.entityId))
    }
    const FightEndMessage = payload => {
        delete socket.player.Fighters
        socket.player.isFighting = false;
        stopFight()
        socket.sendMessage("MapDataRequestMessage", {
            id: mapData.static.id
        })
    }
    const NextTurnMessage = payload => {
        fillGrid({
            cells: clickedSpell.range.map(e => ({ id: e, color: "blue" })).concat(clickedSpell.los.map(e => ({ id: e, color: "#ADD8E6" })))
        })
        for (const id in entitiesRef.current) entitiesRef.current[id]?.setArrow(payload.data.entityId == id);
    }

    const FightStartingMessage = async payload => {
        stopWorld()
        playFight()
        socket.player.isMoving = false;
        const t = staticRef.current.getContext('2d');
        t.clearRect(0, 0, staticRef.current.width, staticRef.current.height);
        await drawStatic("background", mapData.static.id, t)
        fillGrid()
        socket.eventEmitter.off("ActorShowMessage")
        socket.eventEmitter.off("ServerChatMessage", cb)
        setEntities(entities => [])
        setTooltip({ content: "", pos: { x: 0, y: 0 }, entities: [{ name: "", level: -1 }], entity: { name: "", hp: 0 } })
        socket.player.isFighting = true;
        socket.player.printSpellRange = async spell => {
            const { range, los } = await new Promise(r => {
                socket.eventEmitter.once("SpellRangeMessage", payload => {
                    r(payload.data)
                })
                socket.sendMessage("SpellRangeRequest", {
                    spellId: spell.id
                })
            })

            fillGrid({
                cells: range.map(e => ({ id: e, color: "blue" })).concat(los.map(e => ({ id: e, color: "#ADD8E6" })))
            })
            setClickedSpell(r => ({
                id: spell.id,
                range,
                los
            }))
        };
        socket.player.getPath = async cellId => {
            var path = await new Promise(r => {
                socket.eventEmitter.once("PathRequestMessage", payload => {
                    r(payload.data.path)
                })
                socket.sendMessage("PathRequest", {
                    cellId
                })
            })
            path.shift()
            return path;
        };

        socket.eventEmitter.off("FightAddFighter", FightAddFighter)
        socket.eventEmitter.off("FightSyncMessage", FightSyncMessage)
        socket.eventEmitter.off("LifePointsVariation", LifePointsVariation)
        socket.eventEmitter.off("FightDeathMessage", FightDeathMessage)
        socket.eventEmitter.off("FightEndMessage", FightEndMessage)
        socket.eventEmitter.off("NextTurnMessage", NextTurnMessage)


        socket.eventEmitter.on("FightAddFighter", FightAddFighter)
        socket.eventEmitter.on("FightSyncMessage", FightSyncMessage)
        socket.eventEmitter.on("LifePointsVariation", LifePointsVariation)
        socket.eventEmitter.on("FightDeathMessage", FightDeathMessage)
        socket.eventEmitter.on("FightEndMessage", FightEndMessage)
        socket.eventEmitter.on("NextTurnMessage", NextTurnMessage)
    }


    var height, width;
    if ((mainHeight / 20.5) * 2 < mainWidth / 14.5) {
        height = mainHeight / 20.5
        width = height * 2
    } else {
        width = mainWidth / 14.5
        height = width / 2
    }


    const SEGMENT = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2))
    const AREA = height * width / 2


    function canvasOriginPointFromCellId(e) {
        var t = e % 14,
            i = Math.floor(e / 14);
        return t += i % 2 * .5, {
            x: t * width,
            y: .5 * i * height
        }
    }

    function oz() {
        var l = []
        for (var e = 0; e < 560; e += 1) l.push(canvasOriginPointFromCellId(e));
        return l
    }
    const canvasOriginPoints = oz()

    function drawStatic(source, cellId, t) {
        if (source == "background") {
            const src = require(`../public/${cellId}.jpg`).default
            const image = new window.Image();
            image.src = src.src;
            return new Promise(r => {
                image.addEventListener("load", () => r(t.drawImage(image, 0, 0, staticRef.current.width, staticRef.current.height)))
            })
        }

        const { x, y } = canvasOriginPoints[cellId]

        const src = require(`../public/${source}`).default
        const image = new window.Image();
        image.src = src.src;
        const ratio = src.width / src.height
        const imgWidth = src.width < width ? src.width : (source.includes("tree") ? width * 2 : width)
        const imgHeight = imgWidth / ratio
        return new Promise(r => {
            image.addEventListener("load", () => r(t.drawImage(image, x + width / 2 - imgWidth / 2, y - imgHeight + height * 1.5, imgWidth, imgHeight)))
        })
    }

    function getIdFromMouseEvent(ev) {
        var rect = staticRef.current.getBoundingClientRect();
        const x = ev.clientX - rect.left - width / 2
        const y = ev.clientY - rect.top
        const index = canvasOriginPoints.findIndex(function (e) {
            const triangles = [
                {
                    width: distance({ x, y }, { x: e.x, y: e.y }),
                    B: distance({ x, y }, { x: e.x + width / 2, y: e.y + height / 2 }),
                    C: SEGMENT
                },
                {
                    width: distance({ x, y }, { x: e.x + width / 2, y: e.y + height / 2 }),
                    B: distance({ x, y }, { x: e.x, y: e.y + height }),
                    C: SEGMENT
                },
                {
                    width: distance({ x, y }, { x: e.x, y: e.y + height }),
                    B: distance({ x, y }, { x: e.x - width / 2, y: e.y + height / 2 }),
                    C: SEGMENT
                },
                {
                    width: distance({ x, y }, { x: e.x - width / 2, y: e.y + height / 2 }),
                    B: distance({ x, y }, { x: e.x, y: e.y }),
                    C: SEGMENT
                },
            ]

            return Math.round(triangles.map(function (triangle) {
                const perimeter = (triangle.width + triangle.B + triangle.C) / 2;
                return Math.sqrt(perimeter * (perimeter - triangle.width) * (perimeter - triangle.B) * (perimeter - triangle.C))
            }).reduce((width, b) => width + b)) == Math.round(AREA)
        });

        return index == -1 ? false : index;
    }

    const cellClicked = async (ev, direct = false) => {
        const index = !direct ? getIdFromMouseEvent(ev) : direct;

        if ((!index && index != 0) || !isWalkable(mapData.static.cells[index])) return;

        if (socket.player.isFighting) {
            if (clickedSpell.range.includes(parseInt(index))) {
                castSpell(parseInt(index))
            } else {
                if (!socket.player.isMoving) socket.sendMessage("MovementRequestMessage", { cellId: index })
            }
            fillGrid();
            setClickedSpell(r => ({
                id: -1,
                range: [],
                los: []
            }))
        } else if (!socket.player.isMoving) socket.sendMessage("MovementRequestMessage", { cellId: index })
    }

    const changeMap = (direction) => {
        const neighborId = mapData.static[`${direction}NeighbourId`];
        if (!neighborId) return;
        const cells = mapData.static.cells;
        const directions = { "left": [], "right": [], "top": [], "bottom": [] }
        for (const cellId in cells) {
            if (cells[cellId].c & 56 && cellId % 14 === 0) { //left
                directions.left.push(cellId)
                continue;
            }
            if (cells[cellId].c & 131 && cellId % 14 === 13) { //right
                directions.right.push(cellId)
                continue;
            }
            if (cells[cellId].c & 224 && cellId < 28) { //top
                directions.top.push(cellId)
                continue;
            }
            if (cells[cellId].c & 14 && cellId > 531) { //top
                directions.bottom.push(cellId)
                continue;
            }
        }

        const changeCell = directions[direction][Math.floor(Math.random() * directions[direction].length)]
        if (!changeCell) return;
        var comingFrom;
        if (direction == "left") comingFrom = "right"
        else if (direction == "right") comingFrom = "left"
        else if (direction == "top") comingFrom = "bottom"
        else if (direction == "bottom") comingFrom = "top"
        socket.eventEmitter.once("ChangeMapNow", () => {
            setLoading(true);
            setPercentage(0);
            socket.sendMessage("MapDataRequestMessage", {
                id: neighborId,
                comingFrom
            })
        })
        socket.sendMessage("MovementRequestMessage", { cellId: changeCell })

    }

    const cellHovered = async (ev, direct = false) => {
        const index = !direct ? getIdFromMouseEvent(ev) : direct;
        if ((index || index == 0) && isWalkable(mapData.static.cells[index])) {
            gridRef.current.style.cursor = "pointer"

            if (socket.player.isFighting) {
                if (socket.player.ourTurn) {
                    if (clickedSpell.range.length == 0) {
                        const distance = getCellDistance(socket.player.cellId, parseInt(index))
                        if (distance <= socket.player.stats.movementPoints) {
                            const path = await socket.player.getPath(parseInt(index));
                            if (path.length > socket.player.stats.movementPoints) return fillGrid();
                            fillGrid({
                                cells: path.map(e => ({ id: e, color: "green" })),
                            })
                        } else fillGrid()
                    } else {
                        if (clickedSpell.range.includes(parseInt(index))) {
                            const cells = clickedSpell.range.map(function (e) {
                                return { id: e, color: e == parseInt(index) ? "red" : "blue" }
                            }).concat(clickedSpell.los.map(e => ({ id: e, color: "#ADD8E6" })))
                            fillGrid({ cells })
                        } else fillGrid({
                            cells: clickedSpell.range.map(e => ({ id: e, color: "blue" })).concat(clickedSpell.los.map(e => ({ id: e, color: "#ADD8E6" })))
                        })
                    }
                }
            } else {
                changeLeft.current.style.display = "none"
                changeRight.current.style.display = "none"
                changeBottom.current.style.display = "none"
                changeTop.current.style.display = "none"
                const cells = mapData.static.cells;
                const cellId = parseInt(index);
                if (cells[cellId].c & 56 && cellId % 14 === 0 && mapData.static.leftNeighbourId) { //left
                    return changeLeft.current.style.display = "flex"
                }
                if (cells[cellId].c & 131 && cellId % 14 === 13 && mapData.static.rightNeighbourId) { //right
                    return changeRight.current.style.display = "flex"
                }
                if (cells[cellId].c & 224 && cellId < 28 && mapData.static.topNeighbourId) { //top
                    return changeTop.current.style.display = "flex"
                }
                if (cells[cellId].c & 14 && cellId > 531 && mapData.static.bottomNeighbourId) { //bottom
                    return changeBottom.current.style.display = "flex"
                }
            }

        } else gridRef.current.style.cursor = "default"
    }

    const castSpell = (cellId) => {
        if (clickedSpell.id != -1 && clickedSpell.range.includes(cellId) && socket.player.isFighting && socket.player.ourTurn) {
            socket.sendMessage("CastSpellMessage", {
                spellId: clickedSpell.id,
                cellId
            })
        }
    }

    const isWalkable = (cell) => {
        return cell && [67, 3, 195, 75, 83, 71, 7].includes(cell.l)
    }

    const entityHovered = (entityId) => {

        const e = entities.find(e => e.entityId == entityId)
        cellHovered(null, e.cellId)

        if (!e || (socket.player.isFighting && !socket.player.Fighters[e.entityId])) return;
        const tt = {}

        tt.pos = {
            x: entitiesRef.current[entityId].state.x + entitiesRef.current[entityId].width / 2,
            y: entitiesRef.current[entityId].state.y - entitiesRef.current[entityId].height
        }
        if (socket.player.isFighting) {
            tt.entity = {
                name: e.name,
                hp: socket.player.Fighters[e.entityId].stats.lifePoints + "/" + socket.player.Fighters[e.entityId].stats.maxLifePoints
            }
        }
        else {
            if (e.monsterGroup) tt.entities = e.members.map(e => ({ name: e.name, level: e.level }))
            else tt.entities = [{ name: e.name, level: e.level }]
        }


        // entitiesRef.current[entityId].style.cursor = "pointer"

        setTooltip(tt)
    }

    const entityClicked = (entityId) => {
        const e = entities.find(e => e.entityId == entityId)
        cellClicked(null, e.cellId)
        if (e.monsterGroup) {
            socket.sendMessage("MonsterAttackMessage", { entityId })
        }
    }

    const addEntity = (entity) => {
        const { x, y } = canvasOriginPoints[entity.cellId];
        const color = entity.player ? (entity.me ? 1 : 2) : 3
        const src = entity.player ? "player.png" : "cheb.png"
        if (!isNaN(x)) {
            const props = {
                entityId: entity.entityId,
                player: entity.player,
                me: entity.me,
                name: entity.name,
                level: entity.level,
                cellId: entity.cellId,
                sprite: {
                    x,
                    y,
                    src,
                    color
                }
            }
            setEntities(entities => [...entities, props])
        }
    }

    const addMonsterGroup = (monsterGroup) => {
        const { x, y } = canvasOriginPoints[monsterGroup[0].cellId];
        if (!isNaN(x)) {
            const props = {
                entityId: monsterGroup[0].entityId,
                monsterGroup: true,
                members: monsterGroup,
                cellId: monsterGroup[0].cellId,
                sprite: {
                    x,
                    y,
                    src: "cheb.png"
                }
            }
            setEntities(entities => [...entities, props])
        }
    }

    const fillGrid = (highlights = { cells: [] }) => {
        // staticRef.current.style.visibility = "hidden"
        const gridCtx = gridRef.current.getContext('2d');
        gridCtx.clearRect(0, 0, gridRef.current.width, gridRef.current.height)

        gridCtx.strokeStyle = "#CCCCCC";
        for (const cellId in mapData.static.cells) {
            const coords = canvasOriginPoints[cellId]
            const i = coords.x + width / 2
            const j = coords.y
            gridCtx.beginPath();
            gridCtx.moveTo(i, j);
            gridCtx.lineTo(i + width / 2, j + height / 2);
            gridCtx.lineTo(i, j + height);
            gridCtx.lineTo(i - width / 2, j + height / 2);
            gridCtx.closePath();
            if (isWalkable(mapData.static.cells[cellId])) gridCtx.stroke()
            else {
                gridCtx.fillStyle = !mapData.static.cells[cellId].l ? "#777777" : "#bbbbbb";
                gridCtx.fill()

            }
            const highlight = highlights.cells.find(e => e.id == parseInt(cellId));
            if (highlight) {
                gridCtx.fillStyle = highlight.color;
                gridCtx.fill()
            }
        }
    }
    const fillStatic = async (t, players, monsters) => {
        setLoading(true)
        setPercentage(0)
        setEntities(entities => [])

        await drawStatic("background", mapData.static.id, t)
        for (const cellId in mapData.static.cells) {
            const cell = mapData.static.cells[cellId]
            const coords = canvasOriginPoints[cellId]
            const i = coords.x + width / 2
            const j = coords.y
            t.beginPath();
            t.moveTo(i, j);
            t.lineTo(i + width / 2, j + height / 2);
            t.lineTo(i, j + height);
            t.lineTo(i - width / 2, j + height / 2);
            t.closePath();

            if (!isWalkable(cell)) {
                // t.fillStyle = "green"
                // t.strokeStyle = "green"
                // t.fill()
                // t.stroke()
                /*Static sprites*/
                if (cell.t || cell.t == 0) await drawStatic(`tree${cell.t + 1}.png`, cellId, t)
                else if (cell.r || cell.r == 0) await drawStatic(`rock${cell.r + 1}.png`, cellId, t)
                else if (cell.g || cell.g == 0) await drawStatic(`grass${cell.g + 1}.png`, cellId, t)

            } else {
                // t.fillStyle = "#fff"
                // t.strokeStyle = "#fff"
                // t.fill()
                // t.stroke()
            }
            setPercentage(Math.round(parseInt(cellId) * 100 / mapData.static.cells.length));

        }


        for (const player of players) {
            addEntity(player)
        }

        for (const monsterGroup of monsters) {
            addMonsterGroup(monsterGroup)
        }
        setLoading(false)

        stopFight()
        playWorld()
    }



    useEffect(() => {
        setEntities([])

        if (!mapData.static.id) return;
        const staticCanvas = staticRef.current;
        staticCanvas.style.visibility = "visible"

        const gridCanvas = gridRef.current;
        const container = containerRef.current;
        staticCanvas.width = width * 14.5;
        staticCanvas.height = mainHeight;
        gridCanvas.width = width * 14.5;
        gridCanvas.height = mainHeight;
        container.style.width = `${width * 14.5}px`;
        container.style.height = `${mainHeight}px`;

        const t = staticCanvas.getContext('2d');

        fillStatic(t, mapData.players, mapData.monsters)

        if (socket.eventEmitter) {
            socket.eventEmitter.off("MovementMessage")
            socket.eventEmitter.off("ActorShowMessage")
            socket.eventEmitter.off("ServerChatMessage", cb)

            socket.eventEmitter.on("ServerChatMessage", cb)

            socket.eventEmitter.on("MovementMessage", async payload => {
                const { data } = payload;

                if (!entitiesRef.current[data.entityId]) return;
                if (data.entityId == socket.player.entityId) {
                    socket.player.cellId = data.path[data.path.length - 1]
                    setEntities(e => {
                        return e.map(el => {
                            if (el.entityId == data.entityId) el.cellId = data.path[data.path.length - 1]
                            return el;
                        })
                    })
                }
                for (const cell of data.path) {
                    if (!entitiesRef.current[data.entityId]) return;
                    if (data.entityId == socket.player.entityId) socket.player.isMoving = true;
                    await entitiesRef.current[data.entityId].move(canvasOriginPoints[cell].x, canvasOriginPoints[cell].y)
                    if (data.entityId == socket.player.entityId) socket.player.isMoving = false;
                }

                if (!socket.player.isFighting) socket.eventEmitter.emit("ChangeMapNow")
            })

            socket.eventEmitter.on("ActorShowMessage", async payload => {
                const { data } = payload;
                if (data.monsters) {
                    addMonsterGroup(data.monsters)
                } else {
                    addEntity(data)
                }
            })

            socket.eventEmitter.on("ActorRemoveMessage", async payload => {
                const { data } = payload;
                setEntities(entities => entities.filter(e => e.entityId != data.entityId))
            })


            /** FIGHTS **/
            socket.eventEmitter.off("FightStartingMessage", FightStartingMessage)
            socket.eventEmitter.on("FightStartingMessage", FightStartingMessage)
        }
    }, [mainWidth, mainHeight, mapData])


    return (
        <div className={styles.mapContainer} ref={containerRef}>
            {/* <Audio type={audio}/> */}
            <div className={styles.dummy}>
                <Tooltip entities={tooltip.entities} pos={tooltip.pos} content={tooltip.content} entity={tooltip.entity} />
                {entities.map((e, i) => (
                    // e.render
                    <Entity
                        key={e.entityId}
                        src={e.sprite.src}
                        x={e.sprite.x}
                        y={e.sprite.y}
                        width={width}
                        color={e.sprite.color}
                        ref={el => entitiesRef.current[e.entityId] = el}
                        onMouseEnter={() => entityHovered(e.entityId)}
                        onMouseLeave={() => setTooltip({ pos: { x: 0, y: 0 }, entities: [{ name: "", level: -1 }] })}
                        onClick={() => entityClicked(e.entityId)}
                        arrow={false}
                    />
                ))}
            </div>
            <canvas className={styles.mapStatic} ref={staticRef} ></canvas>
            <canvas className={styles.mapGrid} ref={gridRef} onClick={cellClicked} onMouseMove={cellHovered}></canvas>
            <div className={`${styles.changeMap} ${styles.right}`} ref={changeRight} onClick={() => changeMap("right")}>
                <BiRightArrow />
            </div>
            <div className={`${styles.changeMap} ${styles.left}`} ref={changeLeft} onClick={() => changeMap("left")}>
                <BiLeftArrow />
            </div>
            <div className={`${styles.changeMap} ${styles.bottom}`} ref={changeBottom} onClick={() => changeMap("bottom")}>
                <BiDownArrow />
            </div>
            <div className={`${styles.changeMap} ${styles.top}`} ref={changeTop} onClick={() => changeMap("top")}>
                <BiUpArrow />
            </div>
            {loading ? <Preload p={percentage} /> : ""}

        </div>

    )
}


export default MapGrid;