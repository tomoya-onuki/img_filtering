import $ = require('jquery');
declare var require: any;

$(function () {
    new App().init();
});



export class App {
    private cvs: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number = 900 * devicePixelRatio;
    private height: number = 200 * devicePixelRatio;
    private imgWidth: number = 0;
    private imgHeight: number = 0;

    private img: HTMLImageElement = new Image();
    private imgSrc = './test.JPG';
    private filterMode: number = -1;
    private loop: number = 1;

    private noiserate: number = 0.05;

    constructor() {
        this.cvs = <HTMLCanvasElement>$('#main')[0];
        this.ctx = <CanvasRenderingContext2D>this.cvs.getContext("2d");
    }

    public init(): void {
        const me: App = this;
        me.cvs.width = this.width;
        me.cvs.height = this.height;
        me.cvs.style.width = String(this.width / devicePixelRatio) + 'px';
        me.cvs.style.height = String(this.height / devicePixelRatio) + 'px';

        me.img.src = this.imgSrc;
        me.img.onload = () => {
            me.imgWidth = me.img.width * devicePixelRatio;
            me.imgHeight = me.img.height * devicePixelRatio;

            // 画像の描画
            me.ctx.save();
            me.ctx.scale(devicePixelRatio, devicePixelRatio);
            me.ctx.drawImage(me.img, 0, 0);
            me.ctx.restore();
            // 入力画像のimageData化
            let input = me.ctx.getImageData(0, 0, me.imgWidth, me.imgHeight);
            me.ctx.putImageData(input, 0, 0); // 描画

            // ノイズ画像のimageDataの生成
            let noise = me.noise(input, 0);
            me.ctx.putImageData(noise, me.width / 3, 0);

            let pixels = noise;
            me.filtering(pixels)
                .then((output) => {
                    me.ctx.putImageData(output, me.width * 2 / 3, 0); // 描画
                });

            $('#mode').on('change', function () {
                me.filterMode = Number($(this).val());
            });
            $('#noise').on('change', function () {
                const mode = Number($(this).val());
                noise = me.noise(input, mode);
                me.ctx.putImageData(noise, me.width / 3, 0);
            });
            $('#loop').on('input', function () {
                let val = Number($(this).val());
                if (-1 < val) {
                    me.loop = val;
                } else {
                    me.loop = 1;
                    $(this).val(1);
                }
            });
            $('#draw').on('mousedown', function () {
                $('#msg').text('processing...');
            });
            $('#draw').on('click', function () {
                me.filtering(pixels)
                    .then((output) => {
                        me.ctx.putImageData(output, me.width * 2 / 3, 0); // 描画
                        $('#msg').text('done');
                    });
            });
        }
    }

    // 白色雑音をかける
    private noise(pixels: any, mode: number): any {
        let output = this.ctx.createImageData(this.imgWidth, this.imgHeight);
        // output = pixels;
        const s = 70.0;
        const m = 0;
        let pixel: number[] = [255, 255, 255];
        switch (mode) {
            case 0: // ガウスノイズ
                for (let i = 0; i < pixel.length; i++) {
                    pixel[i] = this.gaussRand(m, s)
                }
                break;

            case 1: // ホワイトノイズ
                pixel = [255, 255, 255];
                break;

            case 2: // ごま塩ノイズ
                for (let i = 0; i < pixel.length; i++) {
                    pixel[i] = Math.floor(Math.random()) * 255;
                }
                break;
        }

        for (let i = 0; i < output.data.length; i += 4) {
            const rate = Math.random();
            if (this.noiserate > rate) {
                output.data[i] = pixel[0];
                output.data[i + 1] = pixel[1];
                output.data[i + 2] = pixel[2];
            } else {
                output.data[i] = pixels.data[i];
                output.data[i + 1] = pixels.data[i + 1];
                output.data[i + 2] = pixels.data[i + 2];
            }
            output.data[i + 3] = 255;
        }
        return output;
    }

    private async filtering(pixels: any): Promise<any> {
        const me: App = this;
        return await new Promise(function (resolve, reject) {
            let output = me.ctx.createImageData(me.imgWidth, me.imgHeight);
            for (let i = 0; i < me.loop; i++) {
                for (let y = 1; y < pixels.width - 1; y++) {
                    for (let x = 1; x < pixels.width - 1; x++) {
                        let data: number[] = me.myFilter(x, y, pixels);
                        output = me.setPixel(data, output, x, y)
                    }
                }
            }
            // let x = 1, y = 1;
            // let data: number[] = this.myFilter(x, y, pixels);
            // output = this.setPixel(data, output, x, y)

            // return output;
            resolve(output);
        });
    }

    private myFilter(x: number, y: number, pixels: any): number[] {
        let out: number[] = [0, 0, 0];
        // let out: number[] = [0, 0, 0, 255];
        let a: number[][] = new Array(9);
        let m: number[] = [-1, 0, 1, -1, 0, 1, -1, 0, 1];
        let n: number[] = [-1, -1, -1, 0, 0, 0, 1, 1, 1];
        for (let i = 0; i < a.length; i++) {
            a[i] = new Array(3);
            a[i] = this.getPixel(pixels, x + m[i], y + n[i]);
            // a.push(this.getPixel(pixels, x + m[i], y + n[i]));
        }
        // console.log(a);

        let dists: number[] = [9];
        for (let i = 0; i < m.length; i++) {
            dists[i] = Math.sqrt(Math.pow(m[i], 2) + Math.pow(n[i], 2));
        }
        let sigmaS = this.variance(dists);

        //a = sort(a);
        // グレースケール
        if (this.filterMode == -1) {
            out[0] += (a[4][0] + a[4][1] + a[4][2]) / 3;
            out[1] += (a[4][0] + a[4][1] + a[4][2]) / 3;
            out[2] += (a[4][0] + a[4][1] + a[4][2]) / 3;
        }
        // 水平平均
        else if (this.filterMode == 0) {
            let kernel0: number[] = [
                0, 0, 0,
                1 / 3, 1 / 3, 1 / 3,
                0, 0, 0
            ];
            for (let i = 0; i < a.length; i++) {
                for (let j = 0; j < a[i].length; j++) {
                    out[j] += a[i][j] * kernel0[i];
                }
            }
        }

        // 垂直平均
        else if (this.filterMode == 1) {
            let kernel1: number[] = [
                0, 1 / 3, 0,
                0, 1 / 3, 0,
                0, 1 / 3, 0
            ];
            for (let i = 0; i < a.length; i++) {
                for (let j = 0; j < a[i].length; j++) {
                    out[j] += a[i][j] * kernel1[i];
                }
            }
        }

        // 移動平均
        else if (this.filterMode == 2) {
            for (let i = 0; i < a.length; i++) {
                for (let j = 0; j < a[i].length; j++) {
                    out[j] += a[i][j] * 1 / 9;
                }
            }
        }

        // 加重平均
        else if (this.filterMode == 3) {
            let kernel3: number[] = [
                1.0 / 16, 2.0 / 16, 1.0 / 16,
                2.0 / 16, 4.0 / 16, 2.0 / 16,
                1.0 / 16, 2.0 / 16, 1.0 / 16
            ];
            for (let i = 0; i < a.length; i++) {
                for (let j = 0; j < a[i].length; j++) {
                    out[j] += a[i][j] * kernel3[i];
                }
            }
        }

        // ガウシアン
        else if (this.filterMode == 4) {
            let g: number[] = [9];
            let sum = 0;
            for (let i = 0; i < a.length; i++) {
                g[i] = this.gauss(m[i], n[i], sigmaS);
                sum += g[i];
            }
            for (let i = 0; i < a.length; i++) {
                for (let j = 0; j < a[i].length; j++) {
                    out[j] += a[i][j] * g[i] / sum;
                }
            }
        }

        // 選択的平均
        else if (this.filterMode == 5) {
            let kernel5: number[][] = [
                [1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4, 0, 0, 0, 0],
                [1.0 / 4, 1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 0, 0, 0, 0],
                [0, 1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4, 0, 0, 0],
                [1.0 / 4, 0, 0, 1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 0, 0],
                [0, 1.0 / 5, 0, 1.0 / 5, 1.0 / 5, 1.0 / 5, 0, 1.0 / 5, 0],
                [0, 0, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4, 0, 0, 1.0 / 4],
                [0, 0, 0, 1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4, 0],
                [0, 0, 0, 0, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4, 1.0 / 4],
                [0, 0, 0, 0, 1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4]
            ];
            let varianceList: number[] = [9];
            let optimizedKernel: number[] = [];
            for (let i = 0; i < kernel5.length; i++) {
                let p: number[] = [];
                let g: number[] = [];
                let b: number[] = [];
                for (let j = 0; j < kernel5[i].length; j++) {
                    if (kernel5[i][j] != 0) {
                        p.push(a[j][0] + a[j][1] + a[j][2]);
                    }
                }
                varianceList[i] = this.variance(p);
                if (i > 0) {
                    if (varianceList[i - 1] >= varianceList[i]) {
                        optimizedKernel = kernel5[i];
                    }
                }
            }
            for (let i = 0; i < optimizedKernel.length; i++) {
                for (let j = 0; j < a[i].length; j++) {
                    out[j] += a[i][j] * optimizedKernel[i];
                }
            }
        }

        // バイラテルフィルタ
        else if (this.filterMode == 6) {
            // let sigmaD = variance(a); // 色の分散
            let i1 = this.getPixel(pixels, x, y);
            let buf1 = [0, 0, 0];
            let buf2 = [0, 0, 0];
            for (let i = 0; i < m.length; i++) {
                let i2: number[] = this.getPixel(pixels, x + m[i], y + n[i]);
                let ks = Math.exp(-(Math.pow(m[i], 2) + Math.pow(n[i], 2)) * 0.001);
                for (let j = 0; j < out.length; j++) {
                    let kd = Math.exp(-Math.pow(i1[j] - i2[j], 2) * 0.01);
                    buf1[j] += i2[j] * ks * kd;
                    buf2[j] += ks * kd;
                }
            }
            for (let i = 0; i < out.length; i++) {
                out[i] = buf1[i] / buf2[i];
            }
        }

        // NLMF
        else if (this.filterMode == 7) {
            let min = -5, max = 5;
            let buf1 = [0, 0, 0];
            let buf2 = [0, 0, 0];
            for (let j = min; j < max; j++) {
                let i1 = this.getPixel(pixels, x + j, y + j);
                for (let i = 0; i < m.length; i++) {
                    let i2: number[] = this.getPixel(pixels, x + m[i], y + n[i]);
                    let ks = Math.exp(-(Math.pow(m[i], 2) + Math.pow(n[i], 2)) * 0.001);
                    for (let j = 0; j < out.length; j++) {
                        let kd = Math.exp(-Math.pow(i1[j] - i2[j], 2) * 0.01);
                        buf1[j] += i2[j] * ks * kd;
                        buf2[j] += ks * kd;
                    }
                }
            }
            for (let i = 0; i < out.length; i++) {
                out[i] = buf1[i] / buf2[i];
            }
        }

        // メディアンフィルタ
        else if (this.filterMode == 8) {
            let r: number[] = [9];
            let g: number[] = [9];
            let b: number[] = [9];
            for (let i = 0; i < a.length; i++) {
                r[i] = a[i][0];
                g[i] = a[i][1];
                b[i] = a[i][2];
            }
            out = [r.sort()[4], g.sort()[4], b.sort()[4]];
        }
        return out;
    }


    private gauss(m: number, n: number, v: number): number {
        return 1 / (2 * Math.PI * v) * Math.exp(-(Math.pow(m, 2) + Math.pow(n, 2)) / (2 * v));
    }

    private variance(nums: number[]): number {
        // const n = nums.length;
        let sum: number = 0;
        for (let n of nums) {
            sum += n;
        }
        const means: number = sum / nums.length;

        let tmp: number = 0;
        for (let n of nums) {
            tmp += Math.pow(n - means, 2);
        }

        return tmp / nums.length;
    }

    private getPixel(pixels: any, x: number, y: number): number[] {
        const i = y * (pixels.width * 4) + x * 4;
        // console.log(i);

        let R = pixels.data[i];
        let G = pixels.data[i + 1];
        let B = pixels.data[i + 2];
        let A = pixels.data[i + 3];

        return [R, G, B];
        // return [R, G, B, A];
    }
    private setPixel(data: number[], output: any, x: number, y: number): any {
        const i = y * (output.width * 4) + x * 4;

        output.data[i] = data[0];
        output.data[i + 1] = data[1];
        output.data[i + 2] = data[2];
        output.data[i + 3] = 255;

        return output;
    }

    private rsetResolution(): void {
        this.cvs.width *= devicePixelRatio;
        this.cvs.height *= devicePixelRatio;
    }

    private gaussRand = function (m: number, s: number): number {
        var a = 1 - Math.random();
        var b = 1 - Math.random();
        var c = Math.sqrt(-2 * Math.log(a));
        if (0.5 - Math.random() > 0) {
            return c * Math.sin(Math.PI * 2 * b) * s + m;
        } else {
            return c * Math.cos(Math.PI * 2 * b) * s + m;
        }
    };
}