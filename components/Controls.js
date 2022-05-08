import styles from '../styles/Controls.module.css'
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import {
    GiRoundStar,
    GiBroadsword,
    GiDrippingSword,
    GiRunningShoe,
    GiUpgrade
} from "react-icons/gi"

const Controls = () => {
    const [messages, setMessages] = useState([])
    const [spells, setSpells] = useState([])
    const [stats, setStats] = useState([])
    const [turn, setTurn] = useState({
        currentTime: 0,
        maxTime: 0,
        i: 0
    })

    const [milestone, setMilestone] = useState({
        progress: 0,
        text: ""
    })
    const chatRef = useRef()
    const consoleRef = useRef()
    const spellsRef = useRef({})

    const spellMouseEnter = (i) => {
        spellsRef.current[i].style.display = "block"
    }
    const spellMouseLeave = (i) => {
        spellsRef.current[i].style.display = "none"
    }
    const spellClicked = (spell) => {
        if (spell.disabled || !socket.player.isFighting) return;
        socket.player.printSpellRange(spell)
    }

    const skipTurn = () => {
        socket.player.ourTurn = false;
        clearInterval(turn.i)
        setTurn({
            currentTime: 0,
            maxTime: 0,
            i: 0
        })
        socket.sendMessage("TurnEndMessage")
    }


    useEffect(() => {
        if (socket.eventEmitter && !socket.hooked.includes("controls")) {
            socket.eventEmitter.on("ServerChatMessage", payload => {
                setMessages(messages => [...messages, payload.data])
                const node = consoleRef.current;
                setTimeout(() => node.scrollTop = node.scrollHeight, 100);
            })


            socket.eventEmitter.on("SpellListMessage", payload => {
                socket.player.spells = payload.data.spells;
                setSpells(spells => payload.data.spells)
            })

            socket.eventEmitter.on("CharacterStatsList", payload => {
                socket.player.stats = payload.data.stats;
                const s = payload.data.stats;
                setStats(stats => ({
                    HP: s.lifePoints,
                    maxHP: s.maxLifePoints,
                    AP: s.actionPoints,
                    MP: s.movementPoints,
                    Damage: s.damage,
                    Exp: Math.round(s.exp * 100 / s.maxExp)
                }))
            })

            socket.eventEmitter.on("TurnStartMessage", payload => {
                setSpells(function (spells) {
                    const s = []
                    for (const spell of spells) {
                        // console.log(spell)
                        if (spell.apCost < socket.player.stats.actionPoints) spell.disabled = false
                        else spell.disabled = true
                        s.push(spell)
                        if (spell.id == payload.data.spellId) {
                            setMessages(messages => [...messages, { type: "success", content: `${payload.data.caster}: Casts ${spell.name}` }])
                            const node = consoleRef.current;
                            setTimeout(() => node.scrollTop = node.scrollHeight, 100);
                        }
                    }
                    return s
                })

                socket.player.ourTurn = true;
                setTurn({
                    currentTime: 0,
                    maxTime: payload.data.duration,
                    i: setInterval(() => {
                        setTurn(turn => {
                            if (turn.currentTime >= turn.maxTime && turn.i != 0) {
                                console.log(turn)
                                clearInterval(turn.i)
                                skipTurn()
                            }
                            return ({
                                currentTime: turn.currentTime + 1000,
                                maxTime: payload.data.duration,
                                i: turn.i
                            })
                        })
                    }, 1000)
                })
            })

            socket.eventEmitter.on("SpellCastMessage", payload => {
                var sent;
                setSpells(function (spells) {
                    const s = []
                    for (const spell of spells) {
                        // console.log(spell)
                        if (spell.apCost < socket.player.stats.actionPoints) spell.disabled = false
                        else spell.disabled = true
                        s.push(spell)
                        if (spell.id == payload.data.spellId) {
                            setMessages(messages => [...messages, { type: "success", content: `${payload.data.caster}: Casts ${spell.name}` }])
                            sent = true
                            const node = consoleRef.current;
                            setTimeout(() => node.scrollTop = node.scrollHeight, 100);
                        }
                    }
                    return s
                })
                if (!sent && payload.data.spellName) {
                    setMessages(messages => [...messages, { type: "success", content: `${payload.data.caster}: Casts ${payload.data.spellName}` }])
                    const node = consoleRef.current;
                    setTimeout(() => node.scrollTop = node.scrollHeight, 100);
                }
            })

            socket.eventEmitter.on("LifePointsVariation", payload => {
                if (!socket.player.Fighters) return;
                setMessages(messages => [...messages, { type: "success", content: `${payload.data.name}: ${payload.data.delta} HP.` }])
                const node = consoleRef.current;
                setTimeout(()=>node.scrollTop = node.scrollHeight, 100);
            })

            socket.eventEmitter.on("FightDeathMessage", payload => {
                if (!socket.player.Fighters) return;
                setMessages(messages => [...messages, { type: "success", content: `${payload.data.name}: Dies.` }])
                const node = consoleRef.current;
                setTimeout(()=>node.scrollTop = node.scrollHeight, 100);
            })

            socket.eventEmitter.on("FightEndMessage", payload => {
                clearInterval(turn.i)
                setTurn({
                    currentTime: 0,
                    maxTime: 0,
                    i: 0
                })
            })

            socket.eventEmitter.on("MileStoneMessage", payload => {
                setMilestone({
                    progress: payload.data.progress,
                    text: payload.data.text
                })
            })

            chatRef.current.addEventListener("submit", e => {
                e.preventDefault();
                socket.sendMessage("ChatMessage", {
                    content: e.target.children[1].value
                })
            })

            socket.hooked.push("controls")
        }


    }, [socket.eventEmitter])

    return (
        <>
            <form className={styles.consoleContainer} ref={chatRef}>
                <div className={styles.console} ref={consoleRef}>{
                    messages.map((e, i) => (
                        <p className={styles[e.type]} key={i}>
                            {e.sender ? <b>{e.sender}:</b> : ""} {e.content}
                        </p>
                    ))
                }</div>
                <input type="text" name="msg" placeholder='Send a message...' />
            </form>

            <div className={styles.menu}>
                <div className={styles.stats}>
                    {
                        // Object.keys(stats).map((e) => (<p key={e}>{e}: {stats[e]}</p>))
                    }

                    {
                        <>
                            <div>
                                <p><GiRoundStar style={{ color: "yellow" }} /> <span>{stats.AP}</span></p>
                                <p><GiRunningShoe style={{ color: "green" }} /> <span>{stats.MP}</span></p>
                            </div>

                            <div className={styles.health}>
                                <div className={styles.healthPercentage}>
                                    <p>{stats.HP}</p>
                                    <span style={{ width: "70%", height: 1, margin: "4px 0", border: "1px solid white" }}></span>
                                    <p>{stats.maxHP}</p>
                                </div>
                                <div className={styles.healthOverlay}></div>

                            </div>

                            <div>
                                <p><GiBroadsword style={{ color: "#a57d2a" }} /> <span>{stats.Damage}</span></p>
                                <p><GiUpgrade style={{ color: "blue" }} /> <span>{stats.Exp}%</span></p>
                            </div>
                        </>

                    }
                </div>
                <div className={styles.turnMonitor} style={{ display: socket.player && socket.player.isFighting && socket.player.ourTurn ? "block" : "none" }}>
                    <div className={styles.progress}>
                        <div className={styles.progressDone} style={{ width: `${turn.currentTime * 100 / turn.maxTime}%`, justifyContent: (turn.currentTime * 100 / turn.maxTime < 21) ? "flex-start" : "flex-end" }}>
                            <button onClick={skipTurn}>Skip</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.spells}>
                <div className={styles.spellList}>
                    {
                        spells.map((e, i) => (
                            <div style={{ opacity: !e.disabled ? 1 : 0.6 }} className={styles.spell} key={i} onClick={() => spellClicked(e)} onMouseEnter={() => spellMouseEnter(e.id)} onMouseLeave={() => spellMouseLeave(e.id)}>
                                <div className={styles.spellTooltip} ref={el => spellsRef.current[e.id] = el}>
                                    <h1>{e.name}</h1>
                                    <p>{e.lifeSteal ? <GiDrippingSword style={{ color: "red" }} /> : <GiBroadsword style={{ color: "#a57d2a" }} />} <span>{e.damage[0] + stats.Damage}</span> - <span>{e.damage[1] + stats.Damage}</span></p>
                                    <p><GiRoundStar style={{ color: "yellow" }} /> <span>{e.apCost} AP</span></p>
                                </div>
                                <div style={{ padding: 2 }}>
                                    <Image
                                        layout="responsive"
                                        src={e.iconSrc}
                                        height="40"
                                        width="40"
                                    />
                                </div>

                            </div>
                        ))
                    }
                </div>
                <div className={styles.milestone}>
                    <p>{milestone.text}</p>
                    <p>Pogress: {milestone.progress} / 200</p>
                </div>
            </div>
        </>

    )
}


export default Controls;