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
var deck = [];
var canHit = true;
var canStay = true;
var firstTime = true;
var sounds = true;
var animationDelay = 500;

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

    startGame();
}

async function startGame()
{
    let ms = firstTime ? 0 : animationDelay;

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
    
    canHit = true;
    canStay = true;
    firstTime = false;
}

function buildDeck()
{
    for(i = 0; i < suits.length; i++)
    {
        for(j = 0; j < values.length; j++)
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
    hiddenCard = document.createElement("img");
    hiddenCard.src = "assets/cards/hidden.png";

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

    if(getHand("player") > 21)
    {
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

    canStay = false;
    canHit = false;

    while (hand.get("dealer") < 17)
    {
        await addCardTo("dealer");
        await wait(animationDelay * 1.5);
    }

    await wait(animationDelay * 0.25);
    revealCard();
    await wait(animationDelay);
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
    let card = deck.pop();
    hiddenCard.src = createCard(card).src;

    addValueToHand(getCardValue(card), "dealer");
    playSound(cardSfx);
    updateScores();
}

function checkWinner()
{
    let status = document.getElementById("game-status");
    let dealer = getHand("dealer");
    let player = getHand("player");

    if (player > 21)
    {
        status.innerText = "庄家获胜\n你的点数超过了 21";
    }
    else if (dealer > 21)
    {
        status.innerText = "你赢了\n庄家点数超过了 21";
    }
    else if (player === dealer)
    {
        status.innerText = "平局";
    }
    else
    {
        status.innerText = player > dealer ? "你赢了！" : "庄家获胜";
    }

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
    soundsBtn.innerText = sounds ? "声音：开" : "声音：关";
    soundsBtn.setAttribute("aria-pressed", String(sounds));
    soundsBtn.setAttribute("aria-label", sounds ? "关闭声音" : "开启声音");
}

function playSound(audio)
{
    if (audio && typeof audio.play === 'function' && sounds)
    {
        audio.play();
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
