import React from "react";
import Image from "next/image"

import styles from "../styles/Preload.module.css";


const Preload = ({p}) => {
  return (
    <>
      <div className={styles.overlay}></div>
      <div className={styles.preload}>
        <Image
          src="/preload.png"
          layout="fill"
        />
        {(p || p == 0) ? <p>{p}%</p> : ""}
      </div>

    </>

  );
};

export default Preload;