//Get Username and Room from URL
const {username, roomid, bidamt,type}= Qs.parse(location.search,{
  ignoreQueryPrefix: true
});
// Show Start Btn
if(type==='1')
{
  $('#startBtnContainer').toggleClass('d-none');
  $('#startBtnContainer').click(startGame)
}

function startGame()
{
  socket.emit('startGame',{username,roomid,type});
}

const socket=io({
  path: '/multiplayer-blackjack-service/socket.io'
});

//Join ChatRoom
socket.emit('joinRoom',{username,roomid,bidamt,type});


//Get room and Users
socket.on('roomUsers',({roomid,users})=>
{
  console.log(roomid,users);
    outputRoomName(roomid);
    outputUsers(users);

})
//Add RoomName to DOM
function outputRoomName(roomid)
{
  $('#roomid').html('房间号：<span style="color:#f4bd50;">'+escapeHtml(roomid)+'</span>');
}

//Add Users to DOM
function outputUsers(users)
{
  let content='<li class="list-group-item active">玩家</li>';
  content+=`
  ${users.map(user =>
    `<li class="list-group-item d-flex justify-content-between align-items-center">${escapeHtml(user.username)}
    <span class="badge badge-primary badge-pill">${escapeHtml(user.bidamt)} 分</span>
    </li>`).join('')}`;
  $('.list-group').html(content);
}

function escapeHtml(value)
{
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

//Message from Server
socket.on('message',(message)=>
{
    console.log(message);
})






//Game Play
var hand = [''];
var x = 0;
var the_reveal = $('.the-reveal');



//Game Start Socket Listen
socket.on('gameStarted',function()
{
  if(type==1)
  {
    for(var x = 0; x < 20; x++)
     {
      socket.emit('deal-dealer');
     }
    socket.emit('test-dealer-score');
  }

   $('.waiting').remove();
  the_reveal.show();

  var bj=document.getElementById("bj");
  document.body.style.backgroundImage="linear-gradient(145deg, #0d2c20, #176347)";
  bj.style.color="white";

  var img=document.createElement("img");
  img.setAttribute("src","images/Playing-Cards/A_of_spades_plain.png");
  img.className="smallest";

  var img1=document.createElement("img");
  img1.setAttribute("src","images/Playing-Cards/A_of_spades_plain.png");
  img1.className="smallest";

  bj.prepend(img1);
  bj.appendChild(img);
})




socket.on('disconnected',function(data){
  if(socket.id===data){
  alert("无法加入这个房间");
}
})



$('form').submit(function(){
  socket.emit('chat message', $('#m').val());
  $('#m').val('');
  return false;
});



socket.on('list-of-users', function(data) {
  console.log(data);
  var player_list = '';
  $('#players').html('');
  for(var i = 0; i < data.length; i++) {
    player_list += '<b>' + data[i].name + ' </b>';
    if(i!==data.length-1)player_list+=", ";
  }
  $('#players').html(player_list);
});



socket.on('chat message', function(msg){
  $('#messages').append($('<li>').text(msg));
  window.scrollTo(0, document.body.scrollHeight);
});



socket.on('chat message new', function(msg){
  $('#messages').append($('<li>').text(msg));
  window.scrollTo(0, document.body.scrollHeight);
});


socket.on('score', function(data) {
  $('#score').html('');
  $('#score').html('你的点数：'+data);
  if (data > 21) {
    $('#score').html('');
    $('#score').html('你的点数：'+data + ' <b>爆牌</b>');
    $('#stand').trigger('click');
  }
  if (data == 21) {
    $('#score').html('你的点数：'+data + ' <b>二十一点！</b>');
    $('#stand').trigger('click');
  }
});


socket.on('d_score', function(data) {
  $('#d_score').html('');
  $('#d_score').html('庄家点数：'+data);
  if (data > 21) {
    $('#d_score').html('');
    $('#d_score').html('庄家点数：'+ data + ' <b>爆牌</b>');
  }
  if (data == 21) {
    $('#d_score').html('庄家点数：'+data + ' <b>二十一点！</b>');
  }
});


//User Clicks Stand Button
$('#stand').click(function() {
  socket.emit('stand-button');
});



socket.on('empty-deck', function() {
  $('#winner').html('<b>牌堆已经用完，请重新创建房间。</b>')
});


socket.on('dealer-won',function(data){
  $('#winner').html("庄家获胜，收下 <b>"+data+" 分</b>。");
})


socket.on('winner', function(data) {
  var winner = data;
  $('#winner').html('');
  if (data == 'dealer') {
    $('#d_score').show();
    winner = '<b>庄家获胜</b>'
    $('#winner').append(winner);
  }
  else {
    $('#d_score').show();
    winner = '<b>' +escapeHtml(data) +' </b>拿到了最佳手牌！'
    $('#winner').append(winner);
  }
});



socket.on('yourBet',function(data){
    if(socket.id===data.user.socket){
      let bet;
      if(data.bet>0)
       bet='恭喜 '+escapeHtml(data.user.name)+'，本局赢得 <b>'+data.bet+' 分</b>！';
       else
       bet=escapeHtml(data.user.name)+"，本局扣除 <b>"+(data.bet*-1)+" 分</b>。";
      $("#user").html(bet);
    }
})



//User Btn Handler
socket.on('user-turn', function(turn) {
  if (turn == false) {
    $('#hit').prop("disabled", true);
    $('#stand').prop("disabled", true);
    console.log('buttons disabled');
  }
  if (turn == true) {
    $('#hit').prop("disabled", false);
    $('#stand').prop("disabled", false);
    console.log('buttons enabled');
  }
});




socket.on('make-dealer-card', function(data) {
  make_dealer_card(data.suit, data.rank);
});



let count=0;
function make_dealer_card(suit, rank) {
  var card = document.getElementById("dealerCard");
  var img=document.createElement("img");
  img.id="img"+(count++);
  img.className="small";
  if(suit==="diams")suit="diamonds";
  img.setAttribute("src",'images/Playing-Cards/'+rank+'_of_'+suit+'.png');
  console.log("Dealer got "+suit+rank);
  card.appendChild(img);
}

socket.on('hide-dealer-hand', function() {
 for(let y=1;y<count;y++) $('#img'+y).hide();
 $("#d_score").hide();
});



socket.on('show-dealer-hand', function() {
  for(let y=0;y<count;y++) $('#img'+y).show();
  $("#d_score").show();
 });



$('#hit').click(function() {
  console.log("click on hit button by ",username)
  socket.emit('hit');
});



socket.on('make-card', function(data) {
  make_card(data.suit, data.rank);
});



function make_card(suit, rank) {
  var card = document.getElementById("player");
  var img=document.createElement("img");
  img.className="small";
  if(suit==="diams")suit="diamonds";
  img.setAttribute("src",'images/Playing-Cards/'+rank+'_of_'+suit+'.png');
  console.log("Player got "+suit+rank);
  card.appendChild(img);
}

