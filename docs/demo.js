import { benchmaxx, meridianDawnPreset, downloadSvg, downloadPng } from "./lib/index.js";

const chart = document.querySelector("#chart");
const svgButton = document.querySelector("#svg");
const pngButton = document.querySelector("#png");
const biasButton = document.querySelector("#bias");
const biases = ["honest", "startup", "series-b"];
let biasIndex = 1;
let currentSvg = "";

function render() {
  const config = meridianDawnPreset();
  config.visualBias = biases[biasIndex];
  currentSvg = benchmaxx(config);
  chart.innerHTML = currentSvg;
  biasButton.textContent = `Bias: ${biases[biasIndex]}`;
}

biasButton.addEventListener("click", () => {
  biasIndex = (biasIndex + 1) % biases.length;
  render();
});
svgButton.addEventListener("click", () => downloadSvg(currentSvg, "meridian-dawn-preview.svg"));
pngButton.addEventListener("click", () => downloadPng(currentSvg, "meridian-dawn-preview.png", 2));
render();
