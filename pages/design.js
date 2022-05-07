import styles from '../styles/Home.module.css'
import MapDesign from '../components/MapDesign'
import Controls from '../components/Controls'
import { useEffect, useRef, useState, createRef } from 'react'

import ws from "../logic/WebSocket";

global.socket = {}

export default function Home() {
    const [mainSize, setMainSize] = useState({})
    const [duration, setDuration] = useState(0)
    const [mapData, setMapData] = useState({ static: { cells: [] } })
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
            socket = new ws("ws://localhost:443")
            socket.eventEmitter.on("MapDataMessage", payload => {
                setMapData(payload.data)
            })

            socket.eventEmitter.on("FightStartingMessage", payload => {
                socket.player.Fighters = {}
                setDuration(5)
                const i = setInterval(() => {
                    setDuration(duration => {
                        if(duration - 1 == 0) clearInterval(i)
                        return duration-1
                    })
                }, 1000)
            })

            window.addEventListener("load", handleResize, false);
            window.addEventListener("resize", handleResize, false);
        }

    }, [])


    return (
        <div>
            <div style={{ display: duration > 0 ? "block" : "none" }} className={styles.popup}>
                <h1 style={{ color: "white" }}>Fight is starting in {duration}</h1>
            </div>
            
            <div className={styles.container}>
                <div className={styles.main} ref={mainRef}>
                    <MapDesign mainHeight={mainSize.height} mainWidth={mainSize.width} mapData={mapData} />
                </div>
                <div className={styles.controls}>
                    <Controls spells/>
                </div>
            </div>
        </div>


    )
}
