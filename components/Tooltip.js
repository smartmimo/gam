import styles from '../styles/Tooltip.module.css'
import React from 'react'

import { BsHeartFill } from 'react-icons/bs'
import { useEffect, useRef, useState } from 'react';
const Tooltip = ({ pos = { x: 0, y: 0 }, content = "", entities = [{ name: "", level: -1 }], entity = { name: "", hp: 0 } }) => {
    const [size, setSize] = useState({ height: 0, width: 0 })
    const tooltipRef = useRef()

    useEffect(() => {
        const size = tooltipRef.current?.getBoundingClientRect();
        if (size) {
            setSize({
                width: size.width,
                height: size.height
            })
        }

    }, [pos])
    var style = {}
    if (content != "") {
        style = {
            boxShadow: "1px 2px 15px 0px #000000",
            backgroundColor: "rgba(255,255,255,0.9)",
            color: "black",
            borderRadius: 0,
            padding: "10px 5px 10px 5px",
            maxWidth: "30vw",
            lineHeight: "100%"
        }
    }
    // console.log(pos)
    if (socket.player && socket.player.isFighting) {
        return (
            <div ref={tooltipRef} className={styles.tooltip} style={{
                top: pos.y - size.height + 10,
                left: pos.x - (content == "" ? size.width / 2 : 0),
                display: pos.x != 0 || pos.y != 0 ? "block" : "none",
                ...style
            }}>
                {
                    <>
                        <p className={styles.name}>{entity.name}</p>
                        <p className={styles.level}> <BsHeartFill style = {{color: "red", verticalAlign: "middle"}} /> <span style = {{color: "white", verticalAlign: "middle"}}>{entity.hp}</span></p>
                    </>

                }
            </div>
        )
    }

    return (
        <div ref={tooltipRef} className={styles.tooltip} style={{
            top: pos.y - size.height + 10,
            left: pos.x - (content == "" ? size.width / 2 : 0),
            display: pos.x != 0 || pos.y != 0 ? "block" : "none",
            ...style
        }}>
            {
                content != "" ?
                    <p className={styles.name} style={{ margin: 0, fontWeight: "normal", whiteSpace: "normal" }}>{content}</p> :

                    (entities.length > 1 || entities[0].name == "Cheb Laarbi") ?
                        entities.map((e, i) => (
                            <p key={i} className={styles.oneliner}>{e.name} <span>(Level {e.level})</span></p>
                        )) :
                        (
                            <>
                                <p className={styles.name}>{entities[0].name}</p>
                                <p className={styles.level}>Level <span>{entities[0].level}</span></p>
                            </>
                        )
            }
        </div>

    )
}


export default Tooltip;