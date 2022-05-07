import styles from '../styles/Login.module.css'

import { useEffect, useRef, useState, createRef } from 'react'

import Preload from './Preload'
import Image from 'next/image'
global.socket = {}

export default function Home() {
    const loginRef = useRef()
    const registerRef = useRef()
    const [loading, setLoading] = useState(false)
    const [loginError, setLogErr] = useState("")
    const [registerError, setRegErr] = useState("")
    const cb1 = e => {
        e.preventDefault();
        if(!e.target.children[0].value || !e.target.children[1].value) return setLogErr("Please fill all the fields.")
        socket.sendMessage("HelloMessage", {
            name: e.target.children[0].value,
            pass: e.target.children[1].value
        })
    }

    const cb2 = e => {
        e.preventDefault();
        if(!e.target.children[0].value || !e.target.children[1].value || !e.target.children[2].value) return setRegErr("Please fill all the fields.")
        if(e.target.children[1].value != e.target.children[1].value) return setRegErr("Passwords don't match.")
        socket.sendMessage("RegisterMessage", {
            name: e.target.children[0].value,
            pass: e.target.children[1].value,
            confirmPass: e.target.children[2].value,
        })
    }

    useEffect(() => {
        if(socket.eventEmitter){
            socket.eventEmitter.on("HelloErrorMessage", payload => {
                setLogErr(payload.data.reason)
                setLoading(false)
            })

            socket.eventEmitter.on("RegisterErrorMessage", payload => {
                setRegErr(payload.data.reason)
                setLoading(false)
            })
        }
        loginRef.current.removeEventListener("submit", cb1)
        registerRef.current.removeEventListener("submit", cb2)
        loginRef.current.addEventListener("submit", cb1)
        registerRef.current.addEventListener("submit", cb2)

    }, [])

    return (
        <div className = {styles.container}>
            <h1>
                Welcome to Aliens VS Cheb Laarbi.. Can you stop the invasion?
            </h1>

            <div className={styles.forms}>
                <form className={styles.login} ref={loginRef}>
                    <input type="text" placeholder='Username' />
                    <input type="password" placeholder='Passowrd' />
                    <p className = {styles.err}>{loginError}</p>
                    <button>Login</button>
                </form>
                <form className={styles.register} ref={registerRef}>
                    <input type="text" placeholder='Username' />
                    <input type="password" placeholder='Passowrd' />
                    <input type="password" placeholder='Confirm password' />
                    <p className = {styles.err}>{registerError}</p>
                    <button>Register</button>
                </form>
            </div>
            {loading ? <Preload /> : <></>}
        </div>


    )
}
