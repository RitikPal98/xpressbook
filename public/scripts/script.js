
function goBack(){
  window.history.back();
  // window.history.back();
}
  $(document).ready(function(){
          $("#toggleSlide").click(function(){
              $("#toggleSlide").fadeOut(150).fadeIn(100);
              $("#slidebox").animate({
                  width: "toggle"
              });
          });
      });

if($("#pageteller").val()==="home"){
$("#homeicon").attr("src","/icons/home2.png");

if($("#postlen").val()==="show"){
let message1="<p class='desc'>Start following some people to see their posts here.</p>";
let btn1="<br><a class='btn' href='/people/users/all'>Click here</a>"
$("#postcontainer").after("<div class='post1'></div>");
$(".post1").append(message1);
$(".desc").append(btn1);
}

}else if($("#pageteller").val()==="notification"){
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
if($("#notifier").val()==="yes"){$("#disnotify").submit();}
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
$("#bellicon").attr("src","/icons/bell2.png");
}else if($("#pageteller").val()==="people"){
$("#searchicon").attr("src","/icons/search2.png");
}else if($("#pageteller").val()==="compose"){
$("").attr("src","/icons/search2.png");
$("#composeButton").css("border","2px solid rgb(10,80,80)")
}




  $("#checkboxid").click(function(){
    $("#checkboxid").css({
      "text-shadow":"1px 2px 10px rgb(10,10,10)",
      "zoom":"1.05",
    });
  });


function sendloginmessage(){
  alert("Please LogIn");
}

//*******************************************************************************
// code for userwall
//post
if($("#followH4Id").html()==="You"){
$("#followButtonId").css("background","grey");
$("#followButtonId").css("border","grey");

}
// ===========================================
$("#likeform").submit(function(e) {
  var url = "/likes";
  if($("#liketeller").val()==="/likes"){
   url="/likes";
   $("#liketeller").val("/dislikes");
   $(".likebutton").css("color","rgb(221,30,30)");
  }else{
  url="/dislikes";
  $("#liketeller").val("/likes");
  $(".likebutton").css("color","#777");
  }
 $.ajax({
 type: "POST",
 url: url,
 data: $("#likeform").serialize(),
 success: function(data) {
alert(data);
$('#likeform')[0].reset();
$("#refreshing").load(location.href + " .noOflikes");
 }
 });
 $('#likeform')[0].reset();
 e.preventDefault();
});
$(".likebutton").click(function(event){
$(".likebutton").fadeOut(100).fadeIn(100);
// $("#refreshing2").load(location.href + " #liketeller");
// $("#refreshing2").load(location.href + " #liketeller");
$("#refreshing").load(location.href + " .noOflikes");
$("#refreshing").load(location.href + " .noOflikes");
});


// ----------------------------------------
$("#commentform").submit(function(e) {
 var url = "/comments"; // the script where you handle the form input.
 $.ajax({
 type: "POST",
 url: url,
 data: $("#commentform").serialize(), // serializes the form's elements.
 success: function(data)
 {
// alert(data); // show response from the php script.
 $('#commentform')[0].reset(); // Clear the form
$("#commentBox").load(location.href + " #commentBox");
 }
 });
$("#commentBox").load(location.href + " #commentBox");
$('#commentform')[0].reset();
$("#commentBox").load(location.href + " #commentBox");
 e.preventDefault(); // avoid to execute the actual submit of the form.
});
$("#sendButton").click(function(event){
$("#sendButton").fadeOut(100).fadeIn(100);
$("#commentBox").load(location.href + " #commentBox");
$("#commentBox").load(location.href + " #commentBox");

$("#refreshingCommentsno").load(location.href + " .noOfcomments");
});
// =============================================================================

// =============================================================================
if($("#liketeller").val()==="/dislikes"){
  $(".likebutton").css("color","rgb(221,30,30)");
}
// *****************************************************************************
let d=new Date(Number($(".date").html())).toDateString();
$(".date").html(d);
// =============================================================================


if($("#notifier").val()==="yes"){
  $(".changebell").css("transform","rotate(40deg)");
  $(".changebell").attr("src","/icons/bell3.png");
}

$("#shareform").submit(function(e) {
 var url = "/share"; // the script where you handle the form input.
 $.ajax({
 type: "POST",
 url: url,
 data: $("#shareform").serialize(), // serializes the form's elements.
 success: function(link)
 {
   $('<input>').val(link).appendTo('body').select()
  document.execCommand('copy')

alert("Link copied ; Now you can paste it anywhere you want.");
myFunction();
 $('#shareform')[0].reset(); // Clear the form
 }
 });

$('#shareform')[0].reset();
 e.preventDefault(); // avoid to execute the actual submit of the form.
});
