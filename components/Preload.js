import React from "react";
import Image from "next/image"

import styles from "../styles/Preload.module.css";


const Preload = ({noOverlay}) => {
  return (
      <>
        {!noOverlay ? (<div className = {styles.overlay}></div>) : (<></>)}
        <div className={styles.preload}>
          <Image
            src="/preload.png"
            layout="fill"
          />
        </div>
        </>
    
  );
};

export default Preload;