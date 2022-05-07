import React from "react"
import styles from "../styles/Entity.module.css";


const colsAndRows = {
    "player.png": [3, 4],
    "cheb.png": [3, 8]
}

const dispositions = {
    "player.png": [0, 1, 2, 3],
    "cheb.png": [0, 1, 2, 7, 3, 4, 5, 6]
}
class Entity extends React.Component {
    constructor(props) {
        const { x, y, src, width, color, arrow } = props;
        const disposition = props.disposition || 0;
        super(props);
        const img = require(`../public/${src}`).default

        const numColumns = colsAndRows[src][0];
        const numRows = colsAndRows[src][1];
        this.originalSrc = src
        this.disposition = disposition;
        this.currentFrame = 0;
        this.animationDelta = 1;
        this.src = img.src;

        this.style = {}

        const ratio = img.width / img.height
        if (src == "player.png") this.imgWidth = width * 4 * numColumns
        else this.imgWidth = width * numColumns

        this.imgHeight = this.imgWidth / ratio

        if (src == "player.png") {
            this.width = (this.imgWidth / 4) / numColumns;
            this.height = (this.imgHeight / 2) / numRows;
        } else {
            this.width = (this.imgWidth) / numColumns;
            this.height = (this.imgHeight) / numRows;
        }


        this.arrowSrc = require(`../public/arrow.png`).default.src
        this.arrow = false

        this.v = 50
        this.color = src == "player.png" ? color : 0;

        this.state = {
            x: x,
            y: y,
            frameX: (this.currentFrame + this.color * 3) * this.width,
            frameY: this.disposition * this.height
        }
        this.animate = this.animate.bind(this)
        this.move = this.move.bind(this)
        setInterval(this.animate, 100);
        // setTimeout(() => this.move(309.7573301733994, 408.3164806831174), 1000)
    };

    animate() {
        let maxFrame = colsAndRows[this.originalSrc][0] - 1;

        if (this.currentFrame >= maxFrame) {
            this.currentFrame--;
            this.animationDelta = -1
        } else if (this.currentFrame == 0) {
            this.currentFrame++;
            this.animationDelta = 1
        } else this.currentFrame += this.animationDelta;

        let column = this.currentFrame + this.color * 3;
        // let row = this.disposition;
        this.setState({
            frameX: -column * this.width,
            // frameY: -row * this.height
            // x: this.state.x,
            // y: this.state.y
        })
    }
    setArrow(arrow) {
        this.arrow = arrow;
    }

    move(x, y) {
        if (this.state.x != x) {
            if (this.state.x < x) {
                if (this.state.x < x) {
                    this.disposition = dispositions[this.originalSrc][2] //right
                } else {
                    this.disposition = dispositions[this.originalSrc][1] //left
                }
            }
        }
        if (this.state.y != y) {
            if (this.state.y < y) {
                if (dispositions[this.originalSrc].indexOf(this.disposition) == 2 && dispositions[this.originalSrc][5]) {
                    this.disposition = dispositions[this.originalSrc][5] //bottom-right
                } else if (dispositions[this.originalSrc].indexOf(this.disposition) == 1 && dispositions[this.originalSrc][4]) {
                    this.disposition = dispositions[this.originalSrc][4] //bottom-left
                } else this.disposition = dispositions[this.originalSrc][0] //bottom
            } else {
                if (dispositions[this.originalSrc].indexOf(this.disposition) == 2 && dispositions[this.originalSrc][7]) {
                    this.disposition = dispositions[this.originalSrc][7] //top-right
                } else if (dispositions[this.originalSrc].indexOf(this.disposition) == 1 && dispositions[this.originalSrc][6]) {
                    this.disposition = dispositions[this.originalSrc][4] //top-left
                } else this.disposition = dispositions[this.originalSrc][3] //top

            }
        }

        return new Promise(resolve => {
            const i = setInterval(() => {
                if (this.state.x != x) {
                    if (this.state.x < x) {
                        this.state.x++
                        if(this.originalSrc=="player.png") this.disposition = dispositions[this.originalSrc][2] //right
                    } else {
                        this.state.x--
                        if(this.originalSrc=="player.png") this.disposition = dispositions[this.originalSrc][1] //left
                    }
                    if (Math.abs(this.state.x - x) <= 2) this.state.x = x
                }
                if (this.state.y != y) {
                    if (this.state.y < y) {
                        this.state.y++
                        if(this.originalSrc=="player.png") this.disposition = dispositions[this.originalSrc][0] //bottom
                    } else {
                        this.state.y--
                        if(this.originalSrc=="player.png") this.disposition = dispositions[this.originalSrc][3] //top

                    }
                    if (Math.abs(this.state.y - y) <= 2) this.state.y = y
                }
                if (this.state.x == x && this.state.y == y) {
                    clearInterval(i)
                    resolve(true)
                }

                this.setState({
                    x: this.state.x,
                    y: this.state.y,
                    frameY: -this.disposition * this.height
                })

            }, 100 / this.v)
        })

    }


    render() {
        return (
            <>
                <div
                    onMouseLeave={this.props.onMouseLeave}
                    onMouseEnter={this.props.onMouseEnter}
                    onClick={this.props.onClick}
                    style={{
                        ...this.style,
                        background: `url('${this.src}') ${this.state.frameX}px ${this.state.frameY}px / ${this.imgWidth}px ${this.imgHeight}px content-box`,
                        width: this.width,
                        height: this.height,
                        left: this.state.x,
                        top: this.state.y - 3 * this.height / 4,
                        position: "absolute",
                        paddingLeft: 5,
                        cursor: "pointer",
                        zIndex: 4
                        // backgroundOrigin: "content-box"
                    }}>

                </div>
                {
                    this.arrow ? <img className={styles.arrow} src={this.arrowSrc} style={{
                        width: this.width / 2,
                        height: this.height / 2,
                        left: this.state.x + this.width / 4,
                        top: this.state.y - 3 * this.height / 2,
                        position: "absolute",
                        paddingLeft: 5,
                        zIndex: 4
                    }} /> : <></>
                }
            </>

        );
    }
};

export default Entity;