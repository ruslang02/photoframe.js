import * as cp from 'child_process';
import { createCanvas, Image } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import {Buffer} from 'buffer';
import OpenWeather from 'openweathermap-ts';
import {apiKey, cityName, DEBUG, UPDATE_RATE} from './Environment';

const WIDTH = 640;
const HEIGHT = 360;
const openWeather = new OpenWeather({
  apiKey,
  units: "metric"
});
const vdriveMount = path.join('/tmp', 'photoframe.js', 'drive');
const vdriveFile = vdriveMount + '.bin';
const bgPath = path.join(__dirname, '..', 'bg.jpg');

if (process.getuid() != 0 && !DEBUG)
  throw new Error("This app should be run as root.");

process.on('SIGTERM', () => {
  if (!DEBUG) cp.execSync(`sync && umount ${vdriveMount}`);
  process.exit(0);
})

createVolume();
setInterval(update, UPDATE_RATE);
update();

async function update() {
  const image = await generateImage();
  if (DEBUG)
    return fs.writeFileSync(path.join(__dirname, '..', 'output.jpg'), image);

  uploadImage(image);
  restartUsb();
}
function createVolume() {
  if (DEBUG) return;
  try {
    cp.execSync(`umount ${vdriveMount}`);
  } catch { }
  cp.execSync(`dd if=/dev/zero of=${vdriveFile} bs=512 count=2880`);
  cp.execSync(`mkdosfs ${vdriveFile}`);
  //cp.execSync(`mount ${vdriveFile} ${vdriveMount}`);
}

function restartUsb() {
  try {
    cp.execSync("rmmod g_mass_storage");
  } catch { }
  setTimeout(() => {
    cp.execSync(`modprobe g_mass_storage file=${vdriveFile}`);
  }, 100);
}

function uploadImage(image: Buffer) {
  cp.execSync(`mount ${vdriveFile} ${vdriveMount}`);
  cp.execSync(`mkdir -p ${vdriveMount}`);
  fs.writeFileSync(`${vdriveMount}/image.jpg`, image);
  //cp.execSync(`umount ${vdriveMount}`);
  cp.execSync(`sync && umount ${vdriveMount}`);
}

async function generateImage() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  const bg = new Image();
  bg.onload = () => {
    ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
  };
  bg.src = fs.readFileSync(bgPath);
  ctx.fillStyle = "#f2f2f2";
  ctx.font = "96px sans-serif";
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true
  });
  const timeText = ctx.measureText(time);
  ctx.fillText(time, (WIDTH - timeText.width) / 2, timeText.emHeightAscent + 50);
  
  ctx.font = "12px monospace";
  const pm2Info = cp.execSync("free -m").toString();
  const text = ctx.measureText(pm2Info);
  ctx.fillText(pm2Info, (WIDTH - text.width) / 2, 200);
  try {
  const oWeather = await openWeather.getCurrentWeatherByCityName({
    cityName
  })
  
  ctx.font = "24px sans-serif";
  const weatherIcon = await axios.get<ArrayBuffer>(`http://openweathermap.org/img/wn/${oWeather.weather[0].icon}@2x.png`, {
    responseType: 'arraybuffer'
  })
  const icon = new Image();
  icon.src = Buffer.from(weatherIcon.data);
  const weatherText = oWeather.weather[0].description + ": " + oWeather.main.temp + "°C";
  const wText = ctx.measureText(weatherText);
  ctx.fillText(weatherText, (WIDTH - wText.width) / 2, 335);
  ctx.drawImage(icon, (WIDTH - 100) / 2, 225);
  } catch(e) {
    console.log(e);
  }
  /*
  try {
    ctx.font = "12px monospace";
    const pm2Info = cp.execSync("docker ps").toString();
    const text = ctx.measureText(pm2Info);
    ctx.fillText(pm2Info, (WIDTH - text.width) / 2, 275);
  } catch (e) {

  }
  */
  return canvas.toBuffer("image/jpeg");
}