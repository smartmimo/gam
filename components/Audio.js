// import {useState, useEffect} from "react"
// import useSound from 'use-sound';


// const Audio = ({type}) => {
//     const [audio, setAudio] = useState({ 
//         world: new Audio("/world.mp3"), 
//         fight: new Audio("/fight.mp3"),
//         receiveDamage: new Audio("/rcvDmg.mp3"),
//         deliverDamage: new Audio("/dlvrDmg.mp3")
//     });

//     useEffect(()=>{
//         if(!type.includes("Damage")){
//             for(const i in audio) audio[i].stop();
//         }
//         audio[type].play()
//     }, [type])
// }
// export default Audio;