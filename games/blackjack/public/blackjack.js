// blackjack
// last updated: 10/8/2024

const debug = false; // to debug log messages
const suits = ["C", "D", "H", "S"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const ACE_VALUE = 11;

const hand = new Map();
const aceCount = new Map();
const cardSfx = new Audio("assets/sfx/new_card.mp3");
const gameOverSfx = new Audio("assets/sfx/card_game_over.wav");

var hiddenCard;
var hiddenCardCode;
var deck = [];
var canHit = true;
var canStay = true;
var firstTime = true;
var sounds = localStorage.getItem("blackjack-sounds") !== "off";
var animationDelay = 500;
var roundCount = 0;
var sessionRecord = { wins: 0, losses: 0, ties: 0 };
var audioUnlocked = false;

var hitBtn;
var stayBtn;
var soundsBtn;
var playAgainBtn;

window.onload = function()
{
    preloadImages(); 
    hitBtn = document.getElementById("hit-btn");
    stayBtn = document.getElementById("stay-btn");
    soundsBtn = document.getElementById("sounds-btn");
    playAgainBtn = document.getElementById("play-again-btn");

    hitBtn.addEventListener("click", hit);
    stayBtn.addEventListener("click", stay);
    soundsBtn.addEventListener("click", toggleSound);
    playAgainBtn.addEventListener("click", playAgain);
    playAgainBtn.style.visibility = "hidden";
    soundsBtn.innerText = sounds ? "声音：开" : "声音：关";
    soundsBtn.setAttribute("aria-pressed", String(sounds));
    soundsBtn.setAttribute("aria-label", sounds ? "关闭声音" : "开启声音");
    document.addEventListener("keydown", handleShortcut);
    document.addEventListener("pointerdown", () => { audioUnlocked = true; }, { once: true });
    document.addEventListener("keydown", () => { audioUnlocked = true; }, { once: true });

    startGame();
}

async function startGame()
{
    let ms = firstTime ? 0 : animationDelay;
    roundCount++;
    document.getElementById("round-count").innerText = roundCount;
    setStatus("正在发牌…");
    setControls(false);

    deck = [];
    buildDeck();
    shuffleDeck();
    
    hand.set("dealer", 0);
    hand.set("player", 0);
    aceCount.set("dealer", 0);
    aceCount.set("player", 0);

    addHiddenCard();
    await wait(ms);
    addCardTo("dealer");
    await wait(ms);

    addCardTo("player");
    await wait(ms);
    addCardTo("player");
    updateScores();
    
    setControls(true);
    setStatus(getHand("player") === 21 ? "天生二十一点！庄家正在亮牌…" : "轮到你：要牌或停牌");
    firstTime = false;

    if(getHand("player") === 21)
    {
        await wait(animationDelay);
        await stay();
    }
}

function buildDeck()
{
    for(let i = 0; i < suits.length; i++)
    {
        for(let j = 0; j < values.length; j++)
        {
            deck.push(values[j] + "-" + suits[i]);
        }
    }
}

function shuffleDeck()
{
    let currentIndex = deck.length;

    while (currentIndex != 0)
    {

        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // swapping cards
        [deck[currentIndex], deck[randomIndex]] = [deck[randomIndex], deck[currentIndex]];
    }
}

function addCardTo(subject)
{
    let card = deck.pop();
    let value = getCardValue(card);
    
    addValueToHand(value, subject);
    spawnCard(createCard(card), subject);
    updateScores();
}

function addHiddenCard()
{
    hiddenCardCode = deck.pop();
    hiddenCard = document.createElement("img");
    hiddenCard.src = "assets/cards/hidden.png";
    hiddenCard.alt = "庄家的暗牌";

    spawnCard(hiddenCard, "dealer");
}

function spawnCard(card, subject)
{
    playSound(cardSfx);
    document.getElementById(subject+"-hand").appendChild(card);
}

function createCard(card)
{
    let img = document.createElement("img");

    img.src = "assets/cards/" + card + ".png";
    img.alt = card.replace("-", " ");

    return img;
}

function addValueToHand(value, subject)
{
    let currentValue = hand.get(subject);
    let newValue = currentValue + value;

    hand.set(subject, newValue);

    log("adding " + value + " to " + subject);
    
    if(value == ACE_VALUE)
    {
        adjustAceCount(1, subject);
    }
}

async function hit()
{
    if(!canHit)
    {
        return;
    }

    addCardTo("player");
    setStatus("你选择了要牌");

    if(getHand("player") > 21)
    {
        setStatus("爆牌！庄家正在亮牌…");
        await wait(animationDelay);
        await stay();
    }
}

async function stay()
{
    if(!canStay)
    {
        return;
    }

    setControls(false);
    setStatus("庄家翻开暗牌…");

    revealCard();
    await wait(animationDelay);

    while (getHand("player") <= 21 && getHand("dealer") < 17)
    {
        setStatus("庄家点数不足 17，继续补牌…");
        addCardTo("dealer");
        await wait(animationDelay * 1.5);
    }

    await wait(animationDelay * 0.25);
    checkWinner();
}

function getHand(subject)
{
    while(hand.get(subject) > 21 && aceCount.get(subject) > 0)
    {
        addValueToHand(-10, subject);
        adjustAceCount(-1, subject);
    }

    return hand.get(subject);
}

function revealCard()
{
    hiddenCard.src = createCard(hiddenCardCode).src;
    hiddenCard.alt = hiddenCardCode.replace("-", " ");

    addValueToHand(getCardValue(hiddenCardCode), "dealer");
    playSound(cardSfx);
    updateScores();
}

function checkWinner()
{
    let dealer = getHand("dealer");
    let player = getHand("player");
    let result;

    if (player > 21)
    {
        setStatus("庄家获胜\n你的点数超过了 21");
        result = "losses";
    }
    else if (dealer > 21)
    {
        setStatus("你赢了\n庄家点数超过了 21");
        result = "wins";
    }
    else if (player === dealer)
    {
        setStatus("平局");
        result = "ties";
    }
    else
    {
        result = player > dealer ? "wins" : "losses";
        setStatus(player > dealer ? "你赢了！" : "庄家获胜");
    }

    sessionRecord[result]++;
    updateRecord();
    playSound(gameOverSfx);
    endGame();
}

function endGame()
{
    playAgainBtn.style.visibility = "visible";
    playAgainBtn.focus(); 
    hitBtn.style.visibility = "hidden";
    stayBtn.style.visibility = "hidden";
}


function clearHands()
{
    document.getElementById("dealer-hand").innerHTML = '';
    document.getElementById("player-hand").innerHTML = '';
}

function updateScores()
{
    document.getElementById("dealer-score").innerText = hand.get("dealer") ?? 0;
    document.getElementById("player-score").innerText = getHand("player") ?? 0;
}

function playAgain()
{
    playAgainBtn.style.visibility = "hidden";
    hitBtn.style.visibility = "visible";
    stayBtn.style.visibility = "visible";
    document.getElementById("game-status").innerText = "";
    clearHands();
    startGame();
}

function setControls(enabled)
{
    canHit = enabled;
    canStay = enabled;
    hitBtn.disabled = !enabled;
    stayBtn.disabled = !enabled;
}

function setStatus(message)
{
    document.getElementById("game-status").innerText = message;
}

function updateRecord()
{
    document.getElementById("win-count").innerText = sessionRecord.wins;
    document.getElementById("loss-count").innerText = sessionRecord.losses;
    document.getElementById("tie-count").innerText = sessionRecord.ties;
}

function handleShortcut(event)
{
    if(event.ctrlKey || event.metaKey || event.altKey)
    {
        return;
    }

    const key = event.key.toLowerCase();
    if(key === "h")
    {
        hit();
    }
    else if(key === "s")
    {
        stay();
    }
    else if(key === "n" && playAgainBtn.style.visibility === "visible")
    {
        playAgain();
    }
}

function adjustAceCount(increment, subject)
{
    aceCount.set(subject, aceCount.get(subject) + increment);
}

function getCardValue(card)
{
    let data = card.split("-");

    if(isNaN(data[0]))
    {
        if(data[0] == "A")
        {
            return ACE_VALUE;
        }

        return 10;
    }

    return parseInt(data[0]);
}

async function wait(ms)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}

// used to cache images and display them faster
function preloadImages() {
    suits.forEach(suit => {
        values.forEach(value =>{
            let img = new Image();
            img.src = "assets/cards/" + value + "-" + suit + ".png";
        });
    });
}

function toggleSound()
{
    sounds = !sounds;
    localStorage.setItem("blackjack-sounds", sounds ? "on" : "off");
    soundsBtn.innerText = sounds ? "声音：开" : "声音：关";
    soundsBtn.setAttribute("aria-pressed", String(sounds));
    soundsBtn.setAttribute("aria-label", sounds ? "关闭声音" : "开启声音");
}

function playSound(audio)
{
    const hasActiveGesture = !navigator.userActivation || navigator.userActivation.isActive;
    if (audio && typeof audio.play === 'function' && sounds && audioUnlocked && hasActiveGesture)
    {
        const playback = audio.play();
        if (playback && typeof playback.catch === "function")
        {
            playback.catch(() => {});
        }
    }
}

function log(message)
{
    if(!debug)
    {
        return;
    }

    console.log(message);
}
