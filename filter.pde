int NUM = 0;
String[] label = {
    "水平平均", "垂直平均", "移動平均", "加重平均",
    "ガウシアン", "選択的平均化フィルタ", "バイラテラルフィルタ",
    "NLMF", "メディアンフィルタ"
};
PImage in;
PFont font;
int loop = 1;

void setup() { 
    size(600, 300);
    // im = loadImage("test1.png");
    in = loadImage("test.JPG");
    
    font = createFont("Arial", 12);
    textFont(font);
    
    pixelDensity(displayDensity());
    
} 

void draw() {
    background(255);
    
    in.filter(GRAY);
    PImage tmp = in.get();
    PImage out = createImage(in.width, in.height, RGB);
    
    for (int i = 0; i < loop; i++) {
        tmp = filtering(tmp);
    }
    
    out = tmp;
    fill(0);
    textAlign(CENTER, TOP);
    text("input\n元画像", in.width / 2, in.height);
    text("output\n" + label[NUM] + " (" + loop + "回)", in.width + in.width / 2, in.height);
    image(in, 0, 0);                 // 入力画像を画面左に貼る 
    image(out, in.width, 0);        // 出力画像を画面右に貼る
    
    fill(120);
    textAlign(LEFT, BOTTOM);
    float textTop = in.height + 60;
    float w = 0, x = 10, y = textTop;
    for (int i = 0; i < label.length; i++) {
        String str = i + " : " + label[i];
        w = max(w, textWidth(str));
        text(str, x, y);
        y+=15;
        if(y > 300) {
            y = textTop;
            x += w + 30;
        }
    }
    noLoop();
} 

PImage filtering(PImage img) {
    println("filtering");
    for (int y = 1; y < img.height - 1; y++) { 
        for (int x = 1; x < img.width - 1; x++) { 
            int o = myFilter(x, y, img);
            img.set(x, y, o);
        } 
    }
    
    return img;
}


int myFilter(int x, int y, PImage img) {
    float out = 0;
    float[] a = new float[9];
    int[] m = { - 1, 0, 1, -1, 0, 1, -1, 0, 1};
    int[] n = { - 1, -1, -1, 0, 0, 0, 1, 1, 1};
    for (int i = 0; i < a.length; i++) {
        a[i] = red(img.get(x + m[i], y + n[i]));
    }
    
    float[] dists = new float[9];
    for (int i = 0; i < m.length; i++) {
        dists[i] = sqrt(sq(m[i]) + sq(n[i]));
    }
    float sigmaS = variance(dists);
    
    //a = sort(a);
    switch(NUM) {
        //平均化
        case 0 :
            out = (a[3] + a[4] + a[5]) / 3;
            break;
        
        case 1 :
            out = (a[1] + a[4] + a[7]) / 3;
            break;
        
        case 2 :
            out = (a[0] + a[1] + a[2] + a[3] + a[4] + a[5] + a[6] + a[7] + a[8]) / 9;
            break;
        
        case 3 : // 加重平均
            float kernel3[] = {
                1.0 / 16, 2.0 / 16, 1.0 / 16,
                2.0 / 16, 4.0 / 16, 2.0 / 16,
                1.0 / 16, 2.0 / 16, 1.0 / 16
            };
            out = 0;
            for (int i = 0; i < kernel3.length; i++) {
                out += a[i] * kernel3[i];
            }
            break;
        
        
        case 4 : // ガウシアン
            float[] g = new float[9];
            float sum = 0;
            for (int i = 0; i < a.length; i++) {
                g[i] = gauss(m[i], n[i], sigmaS);
                sum += g[i];
            }
            for (int i = 0; i < a.length; i++) {
                out += a[i] * g[i] / sum;
                // println(i, g[i] / sum);
            }
            // println(out);
            break;
        
        
        case 5 : // 選択的平均化
            float[][] kernel5 = {
                {1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4, 0, 0, 0, 0} ,
                {1.0 / 4, 1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 0, 0, 0, 0} ,
                {0, 1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4, 0, 0, 0} ,
                {1.0 / 4, 0, 0, 1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 0, 0} ,
                {0, 1.0 / 5, 0, 1.0 / 5, 1.0 / 5, 1.0 / 5, 0, 1.0 / 5, 0} ,
                {0, 0, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4, 0, 0, 1.0 / 4} ,
                {0, 0, 0, 1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4, 0} ,
                {0, 0, 0, 0, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4, 1.0 / 4} ,
                {0, 0, 0, 0, 1.0 / 4, 1.0 / 4, 0, 1.0 / 4, 1.0 / 4}
            };
            float[] varianceList = new float[9];
            float[] optimizedKernel = {};
        for (int i = 0; i < kernel5.length; i++) {
            float[] pixels = {};
            for (int j = 0; j < kernel5[i].length; j++) {
                if (kernel5[i][j] != 0) {
                    // pixels[j] = a[j];
                    pixels = append(pixels, a[j]);
                    // println(i, j, a[j], kernel5[i][j]);
                }
            }
            varianceList[i] = variance(pixels);
            if (i > 0) {
                if (varianceList[i - 1] >= varianceList[i]) {
                    optimizedKernel = kernel5[i];
                }
            }
        }
        out = 0;
        for (int i = 0; i < optimizedKernel.length; i++) {
            out += a[i] * optimizedKernel[i];
        }
        break;
        
        case 6 : // バイラテラルフィルタ
            // float sigmaD = variance(a); // 色の分散
            float i1 = red(img.get(x, y));
            float buf1 = 0, buf2 = 0;
            for (int i = 0; i < m.length; i++) {
                float i2 = red(img.get(x + m[i], y + n[i]));
                // float ks = exp( -(sq(float(m[i])) + sq(float(n[i]))) / (2 * sigmaS));
                // float kd = exp( -sq(i1 - i2) / (2 * sigmaD));
                float ks = exp( -(sq(m[i]) + sq(n[i])) * 0.001);
                float kd = exp( -sq(i1 - i2) * 0.01);
                buf1 += i2 * ks * kd;
                buf2 += ks * kd; 
            }
            out = buf1 / buf2;
            break;
        
        case 7 : // NLMF
            int min = -5, max = 5;
            buf1 = 0;
            buf2 = 0;
            for (int j = min; j < max; j++) {
                i1 = red(img.get(x + j, y + j));
                for (int i = 0; i < m.length; i++) {
                    float i2 = red(img.get(x + m[i], y + n[i]));
                    float ks = exp( -(sq(m[i]) + sq(n[i])) * 0.001);
                    float kd = exp( -sq(i1 - i2) * 0.01);
                    buf1 += i2 * ks * kd;
                    buf2 += ks * kd; 
                }
            }
            out = buf1 / buf2;
            break;
        
        case 8 : // median
            float[] b = sort(a);
            out = b[4];
            break;
    }
    return color(out);
}

float gauss(int m, int n, float v) {
    return 1 / (2 * PI * v) * exp( -(sq(m) + sq(n)) / (2 * v));
}

void keyPressed() {
    if (48 <= key && key < label.length + 48) {
        loop();
        NUM = key - 48;
    }
    else if (key == 's') {
        saveFrame("./out/" + label[NUM] + "_" + loop + ".png");
        println("save: ./out/" + label[NUM] + "_" + loop + ".png");
    }
    else if (key ==  'a') {
        loop();
        loop++;
    }
    else if (key ==  'd') {
        loop();
        if (loop > 1) loop--;
    }
}

void keyReleased() {
    noLoop();    
}

// 分散の計算
float variance(float[] nums) {
    int n = nums.length;
    
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += nums[i];
    }
    int mean = sum / n;
    
    int tmp = 0;
    for (int i = 0; i < n; i++) {
        tmp += sq(nums[i] - mean);
    }
    return float(tmp / n);
}