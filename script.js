let level = 1;
let time = 30;
let timer;
let progress = 0;

const terminal = document.getElementById("terminal");
const input = document.getElementById("input");

function startGame() {
  document.getElementById("bootScreen").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
  printLine(">> الاتصال بالسيرفر الآمن...");
  printLine(">> تم الاتصال بنجاح.");
  newChallenge();
  startTimer();
}

function startTimer() {
  timer = setInterval(() => {
    time--;
    document.getElementById("timer").innerText = "TIME: " + time;

    if (time <= 0) {
      clearInterval(timer);
      printLine("!! انتهى الوقت - فشل الاختراق");
      input.disabled = true;
    }
  }, 1000);
}

function randomCode(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

let currentCode = "";

function newChallenge() {
  time = 30;
  document.getElementById("level").innerText = "LEVEL: " + level;

  currentCode = randomCode(4 + level);
  printLine("");
  printLine(">> مرحلة " + level);
  printLine(">> فك الرمز التالي:");
  printLine(">> " + currentCode.split("").join(" "));
}

function submitCommand() {
  const value = input.value.toUpperCase();
  input.value = "";

  printLine("> " + value);

  if (value === currentCode) {
    printLine("✔️ تم فك التشفير بنجاح!");
    level++;
    progress += 20;
    document.getElementById("bar").style.width = progress + "%";

    if (level > 5) {
      clearInterval(timer);
      printLine("🏆 تم السيطرة على النظام بالكامل!");
      input.disabled = true;
    } else {
      newChallenge();
    }
  } else {
    printLine("❌ رمز خاطئ - حاول مرة أخرى");
  }
}

function printLine(text) {
  const p = document.createElement("p");
  p.innerText = text;
  terminal.appendChild(p);
  terminal.scrollTop = terminal.scrollHeight;
}

function playSound() {
  const sound = document.getElementById("sound");
  sound.currentTime = 0;
  sound.play();
}
