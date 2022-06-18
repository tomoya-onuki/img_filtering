size(400, 100);
float x = 0;
float y = 0;
float r = 0;
float g = 0;
float b = 0;
float[] shade = {2, 5, 256};
float margin = 100;

pixelDensity(displayDensity());
 
background(255);
for (int j = 0; j < shade.length; j++) {
  float w = (width - margin) / shade[j];
  float h = height / shade.length;
  y = float(j) / 3 * height;
  
  fill(0);
  textAlign(LEFT, TOP);
  text(int(shade[j])+"階調", 10, y);
  
  for (int i = 0; i < shade[j]; i++) {
    r = i / (shade[j] - 1) * 255;
    x = float(i) / shade[j] * (width - margin) + margin;
    fill(r, g, b);
    stroke(r, g, b);
    rect(x, y, w, h);
  }
}
save("./out/shade.png");
