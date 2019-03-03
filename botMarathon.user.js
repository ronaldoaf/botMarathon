
// ==UserScript==
// @name         BotMarathon
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @require      https://cdn.jsdelivr.net/gh/ronaldoaf/bot1x@d90bffb0805ed7fff098944bd003cb322d0e3493/auxiliar.min.js?
// @match        https://www.marathonbetsite.win/en/live*
// @grant        none
// ==/UserScript==



const CONFIG={
    min: 0.015,
    max: 0.15,
    kelly:0.75
};


const URL_DEFAULT='https://www.marathonbetsite.win/en/live/26418';

const _1ds=100;
const _1s=1000;
const _1m=60*_1s;
const _1h=60*_1m;

const CORTE_REL=66;

const REDUTOR=0.7;



//Retorna a similaridade entre os jogos 1xbet e totalcorner baseado no home e away
function rel_1x_tc(j1x,jtc){
    var a=removeDiacritics((j1x.home+'+'+j1x.away).toLocaleLowerCase());
    var b=removeDiacritics((jtc.home+'+'+jtc.away).toLocaleLowerCase()).split('reserves').join('ii');
    return (similar_text(a,b)*200/(a.length+b.length));
}

//Recarrega a pagina a cada 15 minutos
setInterval(function(){  location.reload(); }, 15*_1m);

window.bot={
   init:function(){
       localStorage.bot_mybets_list=localStorage.bot_mybets_list||'[]';
       bot.mybets.clearBets();
   }
};

bot.mybets={
     listBets: function(){
         return JSON.parse(localStorage.bot_mybets_list);
     },
     addBet: function(bet){
          var mybets_list=bot.mybets.listBets();
          mybets_list.push(bet);
          localStorage.bot_mybets_list=JSON.stringify(mybets_list);
     },
    getBets: function(mid,type){
        var bets=[];
        $(bot.mybets.listBets()).each(function(){
            if(this.mid==mid && this.type==type) bets.push(this);
        });
        return bets;
    },
    clearBets: function(){
        var bets=[];
        $(bot.mybets.listBets()).each(function(){
            if ((+new Date())-this.timestamp<2 *_1h ) bets.push(this);
        });
        localStorage.bot_mybets_list=JSON.stringify(bets);
    }
};

bot.login={
     checkLogin:function(){
         return $('[data-punter-balance-value]').size()==0;
     },
    doLogin:function(cont=0){
        $('#auth_login').val(localStorage._marathon_user);
        $('#auth_login_password').val(localStorage._marathon_pass);
        $('.btn-login').click()
    },
    telaCredenciais:function(){
        $('body').html('<center><br><div style="font-size:3vw;color:blue; border:1px solid;"><br>Digite o seu usuário da Marathonbet<br><input id="usuario" /><br><br>Digite a sua senha da Marathonbet<br><input id="senha" /><br><br><button  id="salvar_senha"" style="background-color: lightgray;font-size:3vw;border:1px solid; id="salvar_senha">Salvar</button><br><br></div></center>');
        $('#salvar_senha').click(function(){
            localStorage._marathon_pass=$('#senha').val();
            localStorage._marathon_user=$('#usuario').val();
            location.reload();
        });
    }
};

