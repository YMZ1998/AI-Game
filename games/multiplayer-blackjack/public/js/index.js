$('.tab a').on('click', function (e) {
    
    e.preventDefault();
    
    $(this).parent().addClass('active');
    $(this).parent().siblings().removeClass('active');
    
    const target = $(this).attr('href');
  
    $('.tab-content > div').not(target).hide();
    
    $(target).fadeIn(600);
    
  });

const roomid = Math.random().toString(20).slice(2, 8).toUpperCase();
$('#roomid').val(roomid);

$('#copy-room').on('click', async function () {
  try {
    await navigator.clipboard.writeText($('#roomid').val());
    $(this).text('已复制');
  } catch {
    $('#roomid').trigger('select');
    document.execCommand('copy');
    $(this).text('已复制');
  }
  setTimeout(() => $(this).text('复制'), 1400);
});

$('form').on('submit', function () {
  const nameInput = $(this).find('input[name="username"]');
  const roomInput = $(this).find('input[name="roomid"]');
  nameInput.val(nameInput.val().trim());
  roomInput.val(roomInput.val().trim().toUpperCase());
});
