import styles from '../styles/Home.module.css'
import MapGrid from '../components/Map'
import Controls from '../components/Controls'
import Preload from '../components/Preload'
import Login from '../components/Login'

import { useEffect, useRef, useState, createRef } from 'react'

import ws from "../logic/WebSocket";

global.socket = {}

export default function Home() {
    const [mainSize, setMainSize] = useState({})
    const [duration, setDuration] = useState(0)
    const [popup, setPopup] = useState({
        title: "",
        text: ""
    })

    const [loading, setLoading] = useState(true);
    const [logged, setLogged] = useState(false);

    const [mapData, setMapData] = useState({ static: { cells: {} } })
    const mainRef = useRef();
    useEffect(() => {
        const handleResize = () => {
            const mainsize = mainRef.current?.getBoundingClientRect();
            if (mainsize) {
                setMainSize({
                    height: mainsize.height,
                    width: mainsize.width
                })
            }

        }
        if (!socket.eventEmitter) {
            socket = new ws("wss://lywa.ddns.net:443")
            socket.eventEmitter.on("ReadyMessage", payload => {
                setLogged(true);

                const { socket, data } = payload;
                socket.player = data;
                socket.sendMessage("MapDataRequestMessage", { id: data.mapId })
            })

            socket.eventEmitter.on("RegisterSuccessMessage", payload => {
                socket.sendMessage("HelloMessage", payload.data)
            })

            socket.eventEmitter.on("MapDataMessage", payload => {
                setMapData(payload.data)
            })

            socket.eventEmitter.on("FightStartingMessage", payload => {
                socket.player.Fighters = {}
                setDuration(5)
                const i = setInterval(() => {
                    setDuration(duration => {
                        if (duration - 1 == 0) clearInterval(i)
                        return duration - 1
                    })
                }, 1000)
            })

            socket.eventEmitter.on("LevelUpMessage", payload => {
                socket.player.level = payload.data.level

                setPopup({
                    title: "Level up !",
                    text: "Your character is now level " + payload.data.level
                })

            })

            socket.eventEmitter.on("FightEndMessage", payload => {
                setPopup({
                    title: "You " + (payload.data.result ? "win !!" : "lose :("),
                    text: "Experience gained: " + payload.data.exp
                })
            })

            window.addEventListener("load", handleResize, false);
            window.addEventListener("resize", handleResize, false);
            setLoading(false)
        }

    }, [])

    return (
        <>
            <div style={{ visibility: logged ? "visible" : "hidden" }}>
                <div style={{ display: duration > 0 ? "block" : "none" }} className={styles.popup}>
                    <h1 style={{ color: "white" }}>Fight is starting in {duration}</h1>
                </div>

                <div style={{ display: popup.title != "" ? "flex" : "none" }} className={styles.closablePopup}>
                    <div>
                        <h1 style={{ color: "white" }}>{popup.title}</h1>
                        <p>{popup.text}</p>
                        <button onClick={() => setPopup({ title: "" })}>Great !</button>
                    </div>

                </div>

                <div className={styles.container}>
                    <div className={styles.main} ref={mainRef}>
                        <h2 style={{ position: "absolute", top: 0, left: 30 }}>[{mapData.static.x}-{mapData.static.y}]</h2>
                        <MapGrid mainHeight={mainSize.height} mainWidth={mainSize.width} mapData={mapData} />
                    </div>
                    <div className={styles.controls}>
                        <Controls spells />
                    </div>
                </div>
                {loading ? <Preload /> : <></>}
            </div>
            {!logged ? <Login /> : <></>}
        </>


    )
}
