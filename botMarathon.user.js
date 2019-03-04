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
    min: 0.01,
    max: 0.15,
    kelly:1.0
};


const URL_DEFAULT='https://www.marathonbetsite.win/en/live/26418';

const _1ds=100;
const _1s=1000;
const _1m=60*_1s;
const _1h=60*_1m;

const CORTE_REL=66;

const REDUTOR=0.7;



//Retorna a similaridade entre os jogos 1xbet e totalcorner baseado no home e away
function rel_mb_tc(jmb,jtc){
    var a=removeDiacritics((jmb.home_vs_away.split(' vs ').join('')).toLocaleLowerCase()).split('-').join('');
    var b=removeDiacritics((jtc.home+'+'+jtc.away).toLocaleLowerCase());
    return (similar_text(a,b)*200/(a.length+b.length));
}

//Recarrega a pagina a cada 15 minutos
setInterval(function(){  location.reload(); }, 15*_1m);

window.bot={
   init:function(){
       localStorage.bot_mybets_list=localStorage.bot_mybets_list||'[]';
       bot.mybets.clearBets();
       bot.loop();
       setInterval(bot.loop,5* _1s);
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
        var loop=setInterval(function(){
            if( $('._message:contains(username or password)').length>0 ){
                clearInterval(loop);
                bot.login.telaCredenciais();
            }
        },_1ds);
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












//obj é o selector Jquery da odds
bot.placeBet=function(obj, stake){
    //var obj=$("[data-selection-key='6949152@Total_Goals4.Under_4.5']");
    var ch=JSON.parse(obj.parents('[data-sel]').attr('data-sel'));
    ch.mid=obj.attr('data-selection-key').split('@')[0];
    ch.u=ch.mid+','+obj.attr('data-selection-key').split('@')[1];
    ch.en=obj.parents('[data-event-name]').attr('data-event-name');
    ch.l=true;

    $.post('https://www.marathonbetsite.win/en/betslip/placebetinoneclick2.htm',{
        ch: JSON.stringify(ch),
        st: stake,
        chd: true
    },function(res){
        res=JSON.parse(res);
        if(res.result!='ERROR'){
            bot.mybets.addBet({
                timestamp: +new Date(),
                mid:Number(ch.mid),
                type:ch.mn,
                stake: stake,
                odds: Number(ch.epr)
            });
        }
    });
}

bot.jaFoiApostado=function(mid, type){
      return (bot.mybets.getBets(mid, type).length>0);
};

bot.getBalance=function(){
    var summ_unplaced_bets=0;
    $(bot.mybets.listBets()).each(function(){
         summ_unplaced_bets+=this.stake;
    });
    return Number($('[data-punter-balance-value]').attr('data-punter-balance-value')) + summ_unplaced_bets*REDUTOR;
}

bot.preparaPagina=function(){
    //Não estiver na url correta direciona;
    if ( !location.href.includes(URL_DEFAULT) ) location.href=URL_DEFAULT;

    //Expande todos os mercados colapsados
    $('.category-container.collapsed').each(function(){
        $(this).find('.icon-collapse').click();
    });

    //Se não estiver selecionado o total de gols de cada jogo seleciona
    $('dl').each(function(){
        if ( $(this).find("[data-coupon-market-type]").attr('data-coupon-market-type')!='TOTAL' ) $(this).parent().find("dd [data-coupon-market-type='TOTAL']").click();
    });
}




bot.loadStats=function(){

    $.getScript('https://bot-ao.com/stats_new.3.18.js',function(){
        var jogos_tc=[];
        var jogos_mb=[];
        //Lê as stats carregada do totalcorner, salvas no localStorage, se o jogo estiver no  Half Time, coloca no array jogo_tc
        $(JSON.parse(localStorage.stats)).each(function(){
            if(this.time=='half') jogos_tc.push(this);
        });
        $("[data-event-name]").each(function(){
            var key=$(this).find("[data-selection-key*='Under']:eq(0)").attr('data-selection-key');
           if ( $(this).find('.time-description').text().trim()=='HT' && key!==undefined){
               var score=$(this).find('.event-description').text().trim().split(' ')[0].split(':');
               var obj_under=$(this).find('[data-selection-price]:eq(0)');
               var obj_over=$(this).find('[data-selection-price]:eq(1)');
               jogos_mb.push({
                   home_vs_away: $(this).attr('data-event-name'),
                   gh: Number(score[0]),
                   ga: Number(score[1]),
                   goal: Number(key.split('Under_')[1]),
                   under: Number( obj_under.attr('data-selection-price') ),
                   over: Number( obj_over.attr('data-selection-price') ),
                   obj_under: obj_under,
                   obj_over: obj_over,
                   mid_under: Number(key.split('@')[0])
               });
           }

        });
        var jogos_mb_relacionados=[];
        $(jogos_tc).each(function(i,jtc){
            $(jogos_mb).each(function(j,jmb){
                if(jtc.gh==jmb.gh && jtc.ga==jmb.ga && rel_mb_tc(jmb,jtc)>=66){
                    jmb.jogo_tc=jtc;
                    jogos_mb_relacionados.push(jmb);
                }
            });
        });
        console.log(jogos_mb_relacionados);
        bot.fazApostas(jogos_mb_relacionados);
    });

}
bot.stakeUnder=function(pl_u,mod0,oddsU){
    var percent=pl_u/(oddsU-1)*(mod0==1 ? 1.3 : 1)*CONFIG.kelly;
    return Math.round(bot.getBalance()*(percent>CONFIG.max ? CONFIG.max : percent  ));
}


//Recebe um array de jogos_mb que possui o jogo_tc relaciona e baseado  na regressão faz as apostas
bot.fazApostas=function(jogos_mb){
    $(jogos_mb).each(function(){
        if (this.jogo_tc===null) return;
        var s_g=this.jogo_tc.gh+this.jogo_tc.ga;
        var s_c=this.jogo_tc.ch+this.jogo_tc.ca;
        var s_s=this.jogo_tc.sh+this.jogo_tc.sa;
        var s_da=this.jogo_tc.dah+this.jogo_tc.daa;
        var s_r=this.jogo_tc.rh+this.jogo_tc.ra;
        var d_g=Math.abs(this.jogo_tc.gh-this.jogo_tc.ga);
        var d_c=Math.abs(this.jogo_tc.ch-this.jogo_tc.ca);
        var d_s=Math.abs(this.jogo_tc.sh-this.jogo_tc.sa);
        var d_da=Math.abs(this.jogo_tc.dah-this.jogo_tc.daa);
        var oddsU=this.under;
        var oddsO=this.over;
        var goal=this.goal;
        var goal_diff=goal-s_g;
        var probU=1/this.under/(1/this.over+1/this.under);
        var probU_diff=Math.abs(probU-0.5);
        var mod0=Number(this.goal % 1===0);

        var pl_u=(-0.0222 * s_g +     -0.0049 * s_c +     -0.0002 * s_da +     -0.0063 * s_s +     -0.0217 * d_g +     -0.0028 * d_s +      0.0166 * goal +      0.0557 * goal_diff +      0.0755 * oddsU +     -0.4233 * probU_diff +      0.0185 * mod0 +     -0.14)>0 ?  -0.139  * s_g +     -0.0064 * s_c +     -0.0006 * s_da +     -0.0056 * s_s +     -0.0398 * d_g +     -0.0044 * d_s +      0.1356 * goal +     -0.0302 * goal_diff +      0.1305 * oddsU +     -0.8786 * probU_diff +     -0.2414 : -1;
        console.log(pl_u);
        if(pl_u>=CONFIG.min && !bot.jaFoiApostado(this.mid_under, 'Total Goals') )  bot.placeBet(obj_under, stakeUnder(pl_u,mod0,oddsU) );

    });
};










bot.loop=function(){

    bot.preparaPagina();

    bot.mybets.clearBets();

    if( bot.login.checkLogin() ) bot.login.doLogin();

    bot.loadStats();
};


bot.init();

