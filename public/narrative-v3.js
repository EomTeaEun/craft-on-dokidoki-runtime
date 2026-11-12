import {momentAt,rememberMoment} from './moments.js';
import {HEROES,bg,cg,formatLine,ROOF_GREETINGS} from './data.js';
import {setScript,score,addEvent} from './engine.js';
import {CHAT_STAGES,chatTurns} from './stages.js';

export const STORY_REVISION=3;
const ALL=['white','black','red'];
const line=(speaker,text,emotion='neutral')=>({speaker,text,emotion});
const n=text=>line('나',text);
const h=state=>state.routeHero||state.episodeHero;
const say=(state,texts,emotion='neutral')=>line(h(state),texts[h(state)],emotion);
const option=(text,next,delta=0,event='',extra={})=>({text,next,delta,event,...extra});
const scene=(title,background,cast,lines,next)=>({title,background,cast,lines,next});
const decision=(title,prompt,options)=>({type:'choice',title,prompt,options});
const street=()=>bg('일상_거리');
const festival=()=>bg('학교축제_밤');

export const NODES={
 lunch:s=>scene('옆자리는 한 자리뿐',bg('연구실_낮'),ALL,[
  n(`${s.flags.firstChatsSkipped?'세 사람과 인사를 나누고 맞은 다음 날.':'세 사람과 처음 이야기를 나눈 다음 날.'} 교수님은 학회 준비로 자리를 비웠다.\n“교내에서는 자연스럽게 지내 보세요.” 그 말만 남기고.`),
  n('점심을 먹으러 일어나자 시오리가 자연스럽게 옆에 섰다.'),
  line('black','어디로 가세요?'),line('나','밥 먹으러.'),line('black','네. 가요.'),line('나','…같이?'),line('black','혼자 드시려고 했어요?','happy'),
  line('white','린카도 나갈 거야. 계속 여기 있으면 지루하니까.'),line('red','…저는 벌써 준비했어요.'),
  n('문 앞에 서 있는 네무를 보며, 오늘 혼자 먹기는 글렀다는 걸 깨달았다.')
 ],'restaurant'),
 restaurant:()=>scene('옆자리는 한 자리뿐',bg('학교앞_식당'),ALL,[
  n('학교 앞 작은 식당. 네 자리짜리 테이블 안쪽에 앉자 셋이 동시에 멈췄다.'),
  line('white','왜 다 서 있어?'),line('red','…린카 씨도 서 계세요.'),line('black','그럼 {user}군이 정해 주실래요?','happy'),
  n('내 옆자리에 앉을 사람을 내가 고르라고...? 밥 한 끼 먹기 힘들군.')
 ],'seat'),
 seat:()=>decision('옆자리는 한 자리뿐','누구에게 옆자리를 권할까?',Object.values(HEROES).map(x=>option(`${x.name}, 여기 앉을래?`,'lunch-banter',2,'첫 외식에서 주인공 옆자리에 앉았다.',{hero:x.id,flag:'seatHero',value:x.id}))),
 'lunch-banter':s=>scene('아직 아무도 아닌데',bg('학교앞_식당'),ALL,[
  line(s.flags.seatHero,{black:'그럼 실례할게요. …다들 왜 그렇게 보세요?',white:'하아? 린카는 딱히 네 옆에 앉고 싶었던 건 아니라고. *망설임 없이 앉는다*',red:'…옆자리, 생각보다 가깝네요.'}[s.flags.seatHero],'shy'),
  n('식사 도중 시오리가 내 입가를 가리켰다. 냅킨을 받으려 했는데, 이미 손이 먼저 다가왔다.'),
  line('black','잠깐만요. 여기. …*입가를 닦아준다*','happy'),line('white','켁…! 아, 물이 이상한 데로 들어갔어!','shy'),
  line('식당 주인','인기 많네 학생~ 여기서 누가 여자친구야?'),line('white','뭐..뭐라는거야!!','jealous'),line('black','……"아직" 아무도 아니랍니다.^^'),line('red','린카, 얼굴이 빨개지셨네요..','happy'),
  n('세 쌍의 눈이 나를 향했다. 이번에는 정말 내 대답이 필요했다.')
 ],'lunch-answer'),
 'lunch-answer':()=>decision('...','주인에게 어떻게 답할까?',[
  option('아.. 그냥 셋 다 친구에요 ','lunch-end',1,'첫 외식에서 서로 알아가는 친구들이라고 소개했다.',{all:true}),
  option('저보다 본인들 의견을 먼저 들어 봐야겠는데요.ㅎㅎ','lunch-end',2,'연인이라는 질문에 각자의 마음을 존중해 대답했다.',{all:true}),
  option('셋 다 제가 관리하는 기체예요!','lunch-end',-2,'식당에서 관리하는 기체라는 소개를 듣고 어색해졌다.',{all:true})
 ]),
 'lunch-end':s=>scene('돌아오는 길',bg('대학교_복도'),ALL,[
  n('식당을 나올 때 주인아주머니가 의미심장하게 웃었다. 아무래도 설명은 별로 도움이 되지 않은 모양이다.'),
  line('white','그 사람 뭐야? 다음에는 다른 식당으로 가.'),line('red','다음에도… 같이 먹는 거네요.'),line('black','그러게요. 벌써 다음 약속을 잡다니.. 린카는 계획적이네요.','happy'),
  n(s.flags.firstChatsSkipped?'...혼자서 여러명을 상대하려니 피곤하군... ':'이번에는 한 사람씩, 단 둘이서 시간을 보내 보기로 했다.')
 ],'personal-select'),
 'personal-select':()=>({type:'selectPersonal',title:'둘이 있으면 다른 얼굴'}),
 'personal-start':s=>{
  const id=s.episodeHero;
  const content={
   black:[n('시오리와 둘이서 학교 밖 산책을 나왔다. 소품 가게 앞에서, 어디든 좋다던 그녀의 걸음이 느려졌다.'),line('나','여기 가보고 싶어?'),line('black','앗...티 났나요?','shy'),n('시오리는 하늘색 리본과 작은 흰 머리핀 사이에서 한참 고민했다.'),line('black','다른 사람 것은 잘 고르겠는데, 제 것을 고르는 건 늘 어렵네요.'),line('나','둘 다 잘 어울릴 것 같아.'),line('black','그건 도움 안 되는 대답이에요.','happy')],
   white:[n('수업이 끝난 오후, 린카와 따로 대화를 나누기 위해 옥상에 올라왔다.'),line('white','뭐, 연애 경험이 없는 것 치곤 장소 선택이 괜찮네. 별건 없지만 - '),n('별로 대화하고 싶은 상태가 아닌가?'),n('내가 문 쪽으로 향하자 린카가 소매를 잡았다.'),line('white','벌써 가?'),line('나','별것 없다며.'),line('white','푸..풍경이 그렇다는 거지. ...린카랑 조금 더 있어줘.','shy'),n('린카는 접힌 내 옷깃을 펴 주다가 거리를 깨닫고 손을 멈췄다.')],
   red:[n('네무와 학교 앞 큰길을 함께 걸었다.'),n('하교시간이라 그런지 사람이 많군, 네무도 불편해 보이고.'),line('나','네무, 불편하면 일찍 돌아갈까?'),line('red','벌써요? 저는 조금 더 같이 있고 싶은데요...'),n('한적한 골목으로 접어드니 네무의 말이 조금씩 늘었다.'),line('red','여기는 소리가 덜 겹쳐요. {user}군 목소리도 잘 들리고요.','happy'),n('가게 창에 비친 우리를 보던 네무와 눈이 마주쳤다. 이번에는 바로 피하지 않았다.')]
  };
  return scene('둘이 있으면 다른 얼굴',id==='white'?bg('옥상_노을'):street(),[id],content[id],'personal-choice');
 },
 'personal-choice':s=>decision('둘이 있으면 다른 얼굴',{black:'시오리가 두 장식을 번갈아 바라본다.',white:'린카가 아직 가까이에 서 있다.',red:'아직 돌아가기에는 조금 이른 시간이다.'}[s.episodeHero],{
  black:[option('계속 보고 있던 흰 머리핀은 어때?','personal-reply',4,'오래 바라보던 흰 머리핀을 알아봐 주었다.'),option('직접 대 봐도 돼? 어울리는지 같이 보자.','personal-reply',3,'허락을 구하고 머리 장식을 함께 골랐다.'),option('아무거나 골라. 둘 다 비슷하잖아.','personal-reply',-3,'함께 고르자는 말을 대수롭지 않게 넘겼다.')],
  white:[option('고마워. 조금 더 같이 있다 가자.','personal-reply',4,'옥상에서 고맙다고 말하고 더 머물렀다.'),option('부끄러워? 나도 조금 긴장했는데.','personal-reply',2,'옥상에서 서로 긴장했다는 것을 알게 되었다.'),option('다른 애들한테도 이러는지 물어봐야겠다.','personal-reply',-3,'둘만의 일을 다른 사람에게 이야기하겠다는 말에 당황했다.')],
  red:[option('네무가 가고 싶은 길로 걸어 볼까?','personal-reply',4,'네무가 직접 고른 조용한 길을 함께 걸었다.'),option('말없이 걸어도 난 편해. 조금 더 걷자.','personal-reply',3,'말없이 함께 걷는 시간이 편하다고 이야기했다.'),option('조용하니까 심심하네. 이제 들어가자.','personal-reply',-3,'조용히 함께 있는 시간이 지루하다는 말을 들었다.')]
 }[s.episodeHero]),
 'personal-reply':s=>scene('처음 생긴 둘만의 약속',s.sceneBg,[s.episodeHero],[
  line(s.episodeHero,(s.lastChoiceDelta>=0?{
   black:'그럼 이걸로 할게요. 다음에 하고 나오면 알아봐 주셔야 해요.',white:'…다음에 올 때도 이 시간쯤이면 좋겠네. 린카는 바람이 마음에 들어서 그래.',red:'오늘은 돌아가는 길이 짧네요. …올 때랑 같은 길인데.'
  }:{black:'…네. 제가 너무 오래 골랐죠. 그래도 잠깐만, 제 얘기도 들어 주실래요?',white:'그 말은 좀… 린카가 둘이 와도 괜찮다고 생각한 이유가 있었는데.',red:'그렇군요. 저는 조금 더 있고 싶었어요. …그 정도는 말해도 되죠?'})[s.episodeHero],s.lastChoiceDelta>=0?'shy':'sad'),
  n('처음 연구실에서 마주 앉았을 때와는 다른 이야기를 나눌 수 있을 것 같았다.')
 ],'chat-personal'),
 'chat-personal':()=>({type:'chat',stage:'personal',next:'personal-end'}),
 'personal-end':s=>scene('다음에도 둘이',s.sceneBg,[s.episodeHero],[
  line(s.episodeHero,{black:'오늘 제가 오래 골랐던 거, 다음에는 놀리지 마세요. …알아보시는 건 괜찮고요.',white:'오늘 얘기는 린카가 기억할게. 다음에는 {user}군이 가고 싶은 곳도 말해 봐.',red:'같이 걸어 주셔서 고마워요. 다음에는… 제가 먼저 불러도 돼요?'}[s.episodeHero],'happy'),
  n('연구실로 돌아왔다. 둘이 나눈 대화는 다른 사람에게 옮기지 않고, 우리 사이에 남겨 두었다.')
 ],'personal-select'),
 'rain-intro':s=>scene('누구에게 돌아갈까',street(),ALL,[
  n(s.flags.personalSkipped?.length?'세 사람과 연구실에서 일상을 보내던 며칠 뒤, 학교에는 축제 안내문이 붙기 시작했다.':'세 사람과 각각 약속했던 외출을 마쳤다. 며칠 뒤, 학교에는 축제 안내문이 붙기 시작했다.'),
  line('white','축제 날에는 아직 일정 잡지 마. 린카가 먼저 말한 거야.'),line('black','어머. 다 같이 갈지, 둘이 갈지도 안 정했는데요?','happy'),line('red','저는… 그날 사람 적은 길부터 찾아둘게요.'),
  n('축제 때 먹을 간식을 사러 나온 우리는 잠깐 흩어졌다. 시오리는 버스 정류장 옆 가게로, 린카는 도서관으로, 네무는 골목의 작은 상점으로 향했다.'),
  n('나는 기숙사에 두고 온 가방을 가져오기로 했다. 잠시 뒤 연구실에서 다시 만나자는 약속이었다.')
 ],'rain-messages'),
 'rain-messages':()=>scene('누구에게 돌아갈까',bg('캠퍼스_비'),[],[
  n('기숙사에 도착하자 굵은 빗방울이 창문을 두드렸다. 방에 있는 우산은 하나뿐이었다.'),
  line('시오리 · 메시지','비가 많이 오네요. 저는 정류장에 있어요. {user}군은 도착하셨어요?'),
  line('린카 · 메시지','린카는 도서관 앞이야. 우산 없어도 조금 기다리면 돼.'),
  line('네무 · 메시지','저는 아직 가게 앞이에요. …다시 나오실 거면, 답장해 주세요.'),
  n('우산을 집었다. 누구에게 먼저 가고 싶은지는, 다른 이유를 붙이기 전에 이미 알고 있었다.')
 ],'rain-select'),
 'rain-select':()=>({type:'selectRain',title:'비가 그칠 때까지'}),
 'rain-arrival':s=>scene('우산 하나의 거리',bg('캠퍼스_비'),[s.routeHero],[
  n(`${HEROES[s.routeHero].name}에게 가겠다고 답하고, 다른 두 사람에게도 연락했다. 둘은 가까운 지름길에서 만나 상점에서 빌린 우산으로 연구실에 돌아가기로 했다.`),
  say(s,{black:'정말 나오셨어요? 어깨 다 젖었잖아요. …그렇게 뛰어오시면 어떡해요.',white:'린카는 기다리면 된다고 했잖아. …안 반갑다는 뜻은 아니고.',red:'…오셨네요. 답장 보고도 문 열릴 때까지는 조금, 안 믿겼어요.'},'shy'),
  n('함께 우산을 쓰고 걸었지만 바람에 빗줄기가 기울었다. 연구실보다 내 기숙사가 훨씬 가까웠다.'),
  line('나','일단 내 방에서 비 좀 피할래? 겉옷도 말리고.'),say(s,{black:'…그럼 잠깐만 실례할게요.',white:'다른 뜻은 없는 거지? …린카도 그렇게 생각해.',red:'들어가도 된다고 한 건… 맞죠? 한 번 더 확인하고 싶어서요.'})
 ],'rain-room'),
 'rain-room':s=>scene('비가 그칠 때까지',bg('기숙사방'),[s.routeHero],[
  n('문을 열자마자 후회했다. 침대 위에는 옷, 책상 옆에는 빈 음료 캔. 급하게 치우다 서랍까지 쏟았다.'),
  say(s,{black:'밖에서는 꽤 어른스럽게 보이려고 하셨구나 싶어서요. 저는 지금도 좋은데.',white:'와. …아직 아무 말도 안 했어. 린카 표정까지 따지지는 마.',red:'…괜찮아요. 저 들어오라고 급하게 치우시는 건, 조금 좋아요.'},'happy'),
  n('수건을 건네고, 젖은 겉옷을 걸었다. 창밖의 비와 벽시계 소리가 평소보다 크게 들렸다.'),
  say(s,{black:'그런데… 왜 저한테 오셨어요?',white:'다른 애들도 우산 없었잖아. 왜 린카 쪽으로 왔어?',red:'저한테 먼저 오고 싶으셨던 거예요?'},'shy')
 ],'rain-choice'),
 'rain-choice':()=>decision('비가 그칠 때까지','왜 찾아왔는지, 솔직하게 말해 볼까?',[
  option('제일 먼저 네 생각이 났어. 같이 있고 싶어서.','rain-reply',4,'비 오는 날 가장 먼저 생각나고 함께 있고 싶어서 찾아왔다고 말했다.'),
  option('걱정됐어. 지금 같이 있으니까 오길 잘한 것 같아.','rain-reply',3,'비 오는 날 걱정되어 찾아왔고 함께 있어 좋다고 말했다.'),
  option('가까워서 왔지. 별다른 이유는 없어.','rain-reply',-3,'비 오는 날 찾아온 데 별다른 이유는 없다고 둘러댔다.')
 ]),
 'rain-reply':s=>scene('우리만 아는 오후',bg('기숙사방'),[s.routeHero],[
  say(s,s.lastChoiceDelta>=0?{black:'…그런 말은 예고해 주셔야 하는데. 지금 표정은 보지 마세요.',white:'그럼… 린카도 여기 조금 더 있을게. 비가 아직 오니까.',red:'다행이다. 저는 그런 이유였으면 좋겠다고 생각했거든요.'}:{black:'그렇군요. 그래도 오늘 저랑 있는 시간은… 조금 특별했으면 좋겠어요.',white:'그런 이유면 굳이 뛰어오지는 않아도 됐잖아. …린카는 조금 기대했네.',red:'…알겠어요. 그래도 저는, 찾아와 주셔서 좋았어요.'},s.lastChoiceDelta>=0?'shy':'sad'),
  n('오늘 일을 어떻게 기억하게 될지는, 지금부터 나눌 이야기에 달려 있을 것 같았다.')
 ],'chat-rain'),
 'chat-rain':()=>({type:'chat',stage:'rain',next:'rain-end'}),
 'rain-end':s=>scene('어제와 다른 내일',bg('캠퍼스_비'),[s.routeHero],[
  n('비가 잦아들었다. 우리는 다 마르지 않은 겉옷을 들고 연구실로 돌아갔다. 우산은 여전히 하나였다.'),
  say(s,{black:'이쪽으로 조금만 더 오세요. …아니, 우산은 안 좁은데요.',white:'아까 방에서 한 얘기, 다른 데서는 하지 마. 린카는 기억할 테니까.',red:'오늘은 비가 조금 더 와도 괜찮겠다고 생각했어요. …이미 그쳤지만요.'},'shy')
 ],'route-morning'),
 'route-morning':s=>scene('어제 일은 우리만 아는 일',bg('연구실_낮'),ALL,[
  n('다음 날 연구실. 어제와 같은 자리에 앉았는데, 둘만 아는 일이 있다는 이유로 눈이 자꾸 마주쳤다.'),
  say(s,{black:'수건은 다음에 가져다드릴게요. …다음이 있다는 말이죠.',white:'린카 옆에 앉아. 거기 의자 삐걱거리잖아. 어제도 그렇고, 물건 좀 잘 봐.',red:'{user}군. 오늘도… 돌아갈 때 잠깐 걸을래요?'},'happy'),
  line('black',s.routeHero==='black'?'…다른 두 분도 왜 웃고 계세요?':'둘이 무슨 일이 있었는지, 굳이 설명 안 하셔도 될 것 같네요.','happy'),
  line('white',s.routeHero==='white'?'린카는 그냥 의자 얘기한 건데!':'알았으니까 문은 닫고 얘기해. 복도까지 다 들리거든.'),
  line('red',s.routeHero==='red'?'…같이 걷자고는 말씀드려도 되잖아요.':'그럼 저희는 먼저 나가 있을게요. …둘이 하던 얘기, 마저 하세요.'),
  n('두 사람은 도서관에 다녀오겠다며 나갔다. 나를 보는 시선에 어제보다 조금 더 긴 침묵이 섞였다.')
 ],'route-conflict'),
 'route-conflict':s=>scene('가까워져서 서운한 말',bg('연구실_낮'),[s.routeHero],{
  black:[n('친구가 보내온 “다정하신 분이네”라는 메시지를 보고 무심코 웃었다.'),line('나','시오리는 원래 누구한테나 다정하잖아.'),line('black','…{user}군한테 하는 말도, 전부 똑같이 들리셨어요?','sad'),n('웃음이 사라진 얼굴을 보고서야 내 말이 다르게 닿았다는 걸 알았다.')],
  white:[n('아까 복도에서 만난 친구에게 린카가 옷깃을 펴 주다 당황했던 이야기를 가볍게 했다. 린카는 웃는 척했지만, 둘만 남자 시선을 돌렸다.'),line('white','린카가 그런 모습 보여 준 게 그렇게 재미있었어?','sad'),line('나','귀여웠다는 얘기였는데…'),line('white','그럼 린카한테 말하면 되잖아. 왜 다른 사람한테 해.')],
  red:[n('축제 때 가기로 한 부스가 붐빌 것 같아, 네무에게 묻지 않고 조용한 전시로 계획을 바꿨다.'),line('red','저는… 원래 가기로 한 곳도 가 보고 싶었어요.','sad'),line('나','사람 많은 거 싫어하니까.'),line('red','싫으면 제가 말할게요. 말하기도 전에 정하지는 말아 주세요.')]
 }[s.routeHero],'repair-choice'),
 'repair-choice':s=>decision('가까워져서 서운한 말','지금 어떤 말을 건넬까?',{
  black:[option('특별히 해 준 말까지 당연하게 받아들였네. 미안해.','repair-reply',3,'시오리의 특별한 호의를 당연하게 받아들인 점을 사과했다.',{repair:true}),option('내가 어떻게 들었는지, 조금 더 얘기해도 될까?','repair-reply',1,'서로의 말이 어떻게 들렸는지 더 이야기하기로 했다.'),option('사실이잖아. 너무 예민하게 받아들이지 마.','repair-reply',-5,'서운함을 예민함이라고 치부했다.')],
  white:[option('둘만의 이야기였는데. 앞으로는 먼저 물어볼게.','repair-reply',3,'린카와의 사적인 일을 남에게 말한 점을 사과했다.',{repair:true}),option('놀리려던 건 아니었어. 네 생각을 듣고 싶어.','repair-reply',1,'장난의 의도보다 린카가 느낀 마음을 듣기로 했다.'),option('그 정도 장난도 못 받아 줘?','repair-reply',-5,'불편했다는 말을 장난도 못 받는다고 넘겼다.')],
  red:[option('네가 고를 기회를 내가 없앴네. 다시 같이 정하자.','repair-reply',3,'네무의 선택을 먼저 묻지 않은 점을 사과하고 함께 정하기로 했다.',{repair:true}),option('내 생각만 했나 봐. 네가 가고 싶던 이유를 들을래.','repair-reply',1,'네무가 원래 장소를 가고 싶었던 이유를 듣기로 했다.'),option('널 위해서 바꾼 건데 왜 그래?','repair-reply',-5,'배려였으니 받아들이라고 말해 서운함이 남았다.')]
 }[s.routeHero]),
 'repair-reply':s=>scene('말을 끝까지 듣는 시간',bg('연구실_낮'),[s.routeHero],[
  say(s,s.flags.repaired?{black:'저도 {user}군 앞에서만 고르는 말이 있어요. 그건… 조금 알아봐 주셨으면 했어요.',white:'린카가 화내는 이유는 알겠지. …이제 {user}군 얘기도 들을게.',red:'…네. 저한테도 고를 시간이 있으면 좋겠어요. 같이 가는 거니까요.'}:{black:'제가 왜 서운했는지, 조금만 더 들어 주실래요?',white:'린카가 얘기하는데 웃어넘기지만 마. 이번에는 제대로 듣고 싶어.',red:'싫다고 끝내려는 건 아니에요. 그러니까… 제 얘기도 들어 주세요.'},s.flags.repaired?'shy':'sad'),
  n('서로 다르게 받아들인 말들을, 이번에는 중간에 끊지 않고 이야기해 보기로 했다.')
 ],'chat-repair'),
 'chat-repair':()=>({type:'chat',stage:'repair',next:'festival-invite'}),
 'festival-invite':s=>scene('이번에는 데이트라고',street(),[s.routeHero],[
  n(s.flags.repaired?'어색했던 대화가 조금 풀렸다. 며칠 뒤, 축제 안내문 앞에서 둘이 걸음을 멈췄다.':'이야기는 했지만 아직 조심스러운 거리가 남았다. 축제 안내문 앞에서 먼저 입을 열었다.'),
  line('나','축제 때 나랑 데이트할래? 이번에는 그냥 외출이라고 안 할게.'),
  say(s,s.flags.repaired?{black:'…네. 이번에는 제가 챙겨드릴 핑계도 필요 없겠네요.',white:'드디어 정확하게 말하네. 린카는… 그날 비워 뒀어.',red:'사람 많은 건 싫은데, 같이 가는 건 좋아요.'}:{black:'어떤 마음으로 하시는 말인지, 이번에는 조금 더 알고 싶어요.',white:'린카가 왜 망설이는지는 알지? …그래도 가서 얘기해 보자.',red:'저도 가고 싶어요. 대신 어디로 갈지는 같이 정해요.'},'shy'),
  n('우리는 약속 시간을 정했다. 이번에는 다른 두 사람도 둘만의 외출이라는 것을 알고 있었다.')
 ],'festival-start'),
 'festival-start':s=>scene('이번에는 정말 둘이',festival(),[s.routeHero],[
  n('축제 날. 불 켜진 부스와 멀리 들리는 공연 소리. 약속 장소에는 오늘 함께하기로 한 한 사람만 있었다.'),
  say(s,{black:'많이 기다리지는 않았어요. …조금 일찍 온 것뿐이에요.',white:'린카는 아까 왔어. 아직 시간 안 됐는데 왜 뛰어와.',red:'여기서 기다리면 제일 먼저 보일 것 같았어요.'},'happy'),
  n('먼저 가기로 한 곳과 잠깐 쉬어 갈 곳을 함께 고르기로 했다.')
 ],'festival-choice'),
 'festival-choice':s=>decision('함께 고르는 축제','어떻게 저녁을 시작할까?',{
  black:[option('아까부터 보고 있던 달콤한 음료, 같이 마실래?','festival-middle',4,'시오리가 바라보던 달콤한 음료를 알아보고 함께 골랐다.'),option('오늘 제일 해 보고 싶은 걸 먼저 말해 줘.','festival-middle',3,'시오리가 하고 싶은 일을 먼저 고르도록 했다.'),option('난 아무거나. 시오리가 다 정해 줘.','festival-middle',-3,'데이트 일정도 시오리에게 전부 맡겼다.')],
  white:[option('영화 동아리에서 단편을 상영한대. 같이 보러 갈까?','festival-middle',4,'린카가 좋아하는 영화를 기억하고 영화 동아리 상영 부스를 함께 찾았다.'),option('지도는 잠깐 접어 두고 같이 골라 볼까?','festival-middle',2,'린카와 완벽한 일정 없이 축제를 돌아다녔다.'),option('교육형이니까 전부 설명해 줘. 듣고 있을게.','festival-middle',-3,'데이트에서도 린카에게 설명하는 역할만 기대했다.')],
  red:[option('저쪽 가 보고 싶어? 네가 고른 곳부터 가자.','festival-middle',4,'네무에게 축제에서 가고 싶은 곳을 직접 물었다.'),option('붐비면 잠깐 빠져나와도 돼. 같이 다녀 보자.','festival-middle',3,'네무와 함께 다녀 보되 쉬고 싶을 때 쉴 수 있게 했다.'),option('사람 많으니까 네무는 밖에서 기다려.','festival-middle',-4,'네무의 의견을 묻지 않고 축제 바깥에서 기다리게 했다.')]
 }[s.routeHero]),
 'festival-middle':s=>scene('손을 놓지 않는 이유',festival(),[s.routeHero],{
  black:[n('한 부스의 학생이 “커플은 두 잔 할인”이라고 했다. 시오리는 잠깐 나를 보더니 해명하지 않았다.'),line('black','아까는 왜 아니라고 안 하셨어요?','happy'),line('나','시오리도 안 했잖아.'),line('black','저는 싫지 않았으니까요.'),n('사람이 지나가며 우리 사이를 좁혔다. 내가 먼저 손을 내밀자, 시오리는 처음으로 대답을 고르는 데 오래 걸렸다.')],
  white:[n('린카는 귀신의 집이 시시하다더니 들어가자는 말에는 줄이 길다고 했다. 결국 들어간 뒤에도 장치를 하나씩 지적했다.'),line('white','저기 사람이 숨어 있네. 다음엔 오른쪽에서 나오겠지.'),line('나','응.'),line('white','…왜 자꾸 웃어?'),line('나','아까부터 내 손 잡고 있어서.'),n('출구의 불빛 아래에서도 린카는 손을 놓지 않았다.')],
  red:[n('네무는 가 보고 싶던 부스를 구경한 뒤, 건물 뒤편 계단을 가리켰다. 둘이 앉자 멀리서 공연 소리만 들렸다.'),line('나','축제 보러 와서 여기 있어도 괜찮아?'),line('red','저는 축제가 보고 싶어서 온 게 아닌데.','shy'),line('나','그렇게 말하면… 긴장돼.'),line('red','다행이다. 저만 그런 줄 알았어요.'),line('red','…손잡아도 돼요?','shy')]
 }[s.routeHero],'festival-hand'),
 'festival-hand':s=>decision('둘만의 속도','가까워진 순간, 어떻게 할까?',{
  black:[option('오늘은 내가 먼저 잡아도 되지?','festival-reply',4,'먼저 물은 뒤 시오리의 손을 잡았다.',{flag:'handHeld',value:true}),option('천천히 가자. 옆에서 같이 걸을게.','festival-reply',2,'손을 서두르지 않고 나란히 걸었다.'),option('다른 애들한테도 이러는 거지?','festival-reply',-5,'시오리의 특별한 호의를 또 다른 사람들과 비교했다.')],
  white:[option('조금만 더 이렇게 걸을까?','festival-reply',4,'린카가 잡은 손을 놀리지 않고 계속 잡아 주었다.',{flag:'handHeld',value:true}),option('놀리지 않을게. 린카가 편한 대로 해.','festival-reply',3,'린카가 편한 속도로 가까워질 수 있게 했다.'),option('아까 놀란 거 다들한테 말해 줘야겠다.','festival-reply',-5,'둘만의 부끄러운 일을 다시 남에게 말하겠다고 했다.')],
  red:[option('응. 나도 잡고 싶었어.','festival-reply',4,'네무가 물어본 뒤 서로 동의해 손을 잡았다.',{flag:'handHeld',value:true}),option('아직 조금 떨려. 천천히 가까워져도 될까?','festival-reply',2,'손잡는 속도를 서두르지 않고 솔직하게 이야기했다.'),option('손잡으면 사진도 찍어야지. 여기 봐.','festival-reply',-5,'촬영을 꺼리는 네무에게 갑자기 사진을 요구했다.')]
 }[s.routeHero]),
 'festival-reply':s=>scene('다음 약속',festival(),[s.routeHero],[
  say(s,s.lastChoiceDelta>=0?{black:'…놓으라는 뜻은 아니에요. 그냥, 지금은 제가 더 긴장한 것 같아서.',white:'린카가 아직 놀라서 이러는 건 아니야. …알면 그냥 같이 걸어.',red:'…네. 천천히라도, 같은 쪽으로 가는 거면 좋아요.'}:{black:'그렇게 들리셨다면… 오늘 제 마음을 다시 설명하고 싶어요.',white:'그건 하지 말라고 했잖아. 린카가 왜 불편한지, 정말 모르겠어?',red:'사진은 아직 싫어요. 같이 있는 것도… 제 말을 들어 주셔야 좋아요.'},s.lastChoiceDelta>=0?'love':'sad'),
  n('돌아가기 전에 잠깐 더 앉았다. 오늘의 일과, 아직 오지 않은 다음 이야기를 나누고 싶었다.')
 ],'chat-festival'),
 'chat-festival':()=>({type:'chat',stage:'festival',next:'ordinary'}),
 ordinary:s=>scene('아무 일도 없는 날',bg('연구실_낮'),ALL,[
  n('축제 다음 날에도 연구실은 열렸다. 누군가 과자 봉지를 뜯고, 누군가는 창문을 조금 열었다.'),
  line('white','린카가 아까 남겨 둔 거 누가 먹었어?'),line('red','이름을 안 써 두셔서… 공용인 줄 알았어요.','happy'),line('black','다음에는 같이 사러 가요. 한 봉지 말고 세 봉지로요.'),
  n('다른 두 사람은 둘이 가까워진 것을 알아차렸다. 서운함이 전혀 없는 건 아니겠지만, 우리 넷의 점심까지 없어지지는 않았다.'),
  line('나','처음에는 솔직히 좀 막막했거든.'),line('white','린카를 보고?'),line('나','셋 다.'),line('black','너무하시네요.','happy'),line('red','지금도… 조금은요?'),
  line('나','아니. 이제는 없는 쪽이 이상할 것 같아.'),n('잠깐 조용해졌다. 시오리는 음료를 따르고, 린카는 과자 봉지를 접고, 네무는 나를 한 번 더 바라봤다.')
 ],'ordinary-private'),
 'ordinary-private':s=>{
  const drink=s.profiles[s.routeHero].memory.facts.find(x=>x.key==='favorite_drink')?.value;
  return scene('다음에도 같은 길',street(),[s.routeHero],[
   n('며칠 뒤, 둘이 음료를 사러 나왔다. 축제에서 다음에도 만나자고 했던 약속을 이야기하다가 자연스럽게 웃었다.'),
   say(s,drink?{black:`전에 ${drink} 좋아하신다고 하셨죠. 오늘은 제가 기억하고 골랐어요.`,white:`${drink}. 린카는 기억했어. 이번에는 {user}군이 고를 차례야.`,red:`${drink} 좋아하신다고 하셨던 거… 오늘도 같아요? 같이 마시고 싶어서요.`}:{black:'오늘은 제가 고른 것도 같이 마셔 보실래요?',white:'오늘은 린카가 먼저 골라도 되지? 지난번이랑 다른 걸로.',red:'오늘은 돌아갈 때… 조금 먼 길로 가요.'},'happy'),
   n('같은 길인데, 처음 둘이 나왔던 날과는 걷는 간격이 달랐다.'),
   say(s,{black:'그런데 오늘은 뭐 마시고 싶으세요?',white:'그래서 오늘은 뭘로 할 거야?',red:'…오늘은 어떤 음료가 좋으세요?'}),
   line('나','방금 골랐잖아.'),say(s,{black:'…제가 그랬나요? 미안해요. 잠깐 다른 생각을 했나 봐요.',white:'알아. 린카가 못 들은 척한 거야. …아마.',red:'…한 번만 더 말해 주시면 안 돼요?'},'sad'),
   n('웃으며 넘기려다, 잡고 있던 손끝이 잠깐 멈춘 것을 느꼈다.')
  ],'crisis');
 },
 crisis:s=>scene('방금, 무슨 말 하셨어요?',bg('연구실_밤'),ALL,[
  n('비슷한 일이 다른 두 사람에게도 있었다. 연구실로 돌아오니 셋이 낮은 목소리로 이야기하다가 말을 멈췄다.'),
  line('나','알고 있었어?'),line('black','확실해지기 전에는 걱정시키고 싶지 않았어요.','sad'),line('white','숨기려고 한 건… 아니, 숨긴 건 맞는데. 린카도 금방 괜찮아질 줄 알았어.'),line('red','잊어버린 얘기를 서로 알려 드리면, 넘어갈 수 있을 줄 알았어요.'),
  n('교수님에게 전화를 걸었다. 기다리는 동안 세 사람은 서로를 보았다. 아무도 먼저 자리를 뜨지 않았다.')
 ],'crisis-call'),
 'crisis-call':s=>scene('남기고 싶은 시간',cg('03_감정파형_충돌'),[],[
  line('교수 · 통화','로그를 봤습니다. 세 기체의 관계 기억은 따로지만, 학습 결과를 반영하는 공통 모델에서 충돌이 반복되고 있어요.'),
  line('교수 · 통화','지금은 잠깐 말을 놓치는 정도지만, 그대로 두면 일상 동작도 멈출 수 있습니다. 내일 정기 교체 때 관계 기억을 초기화해야겠습니다.'),
  line('나','그럼… 우리 같이 나갔던 일도 전부요?'),line('교수 · 통화','기본 성격과 언어 기능은 유지됩니다. 학생과 함께한 관계의 기억은 남지 않습니다.'),
  n('점심 자리, 우산 아래 어깨, 축제에서 마주 잡았던 손. 교수님이 말한 “관계 기억”은 모두 그런 것들이었다.'),
  line('교수 · 통화','한 기체라면 공통 서버에서 분리해 장기 관찰을 이어갈 수 있습니다. 다만 그 관계를 계속하고 싶은지는 두 사람이 직접 확인해야겠죠.'),
  n(`나는 ${HEROES[s.routeHero].name}에게 직접 이야기하고 싶다고 말했다. 비 오는 날부터 함께 이어 온 약속을, 지금도 지키고 싶은지.`)
 ],'before-roof'),
 'before-roof':s=>scene('다음에도 함께',bg('연구실_밤'),[s.routeHero],[
  say(s,{black:'일단 앉으세요. 그렇게 서 계시지 말고. …저도 지금은 무슨 말을 해야 할지 모르겠어요.',white:'아직 결정된 건 아니잖아. 그 표정부터 그만해. 린카가 할 말도 들어 줘.',red:'…저희 때문에 미안한 얼굴 하지 마세요. 지금은 제 얼굴을 보고 이야기해 주셨으면 좋겠어요.'},'sad'),
  line('나','잠깐 바람 쐴래? 처음부터 다시 얘기하는 대신, 우리 했던 얘기부터.'),
  n('우리는 옥상으로 올라갔다. 이번에는 내려가자는 말을 누가 먼저 할지 생각하지 않았다.')
 ],'chat-roof'),
 'chat-roof':()=>({type:'chat',stage:'roof',next:'final'})
};

export function choiceOptions(state){return NODES[state.nodeId]?.(state)?.options||[];}
function record(state,item){
 if(item.moment)rememberMoment(state,item.moment);
 if(item.bg)state.sceneBg=item.bg;
 if(item.cast)state.cast=item.cast;
 state.history.push({speaker:HEROES[item.speaker]?.name||(item.speaker==='나'?state.name:item.speaker)||'이야기',text:formatLine(item.text,state.name)});
 
}
export function enterNode(state,id){
 if(id==='personal-select'&&state.personalDone.length===3)id='rain-intro';
 if(id==='final'){
  state.phase='final';state.cast=[];state.sceneBg=cg('04_MEMORY_RESET');state.nodeId='final';state.chapterTitle='기억하고 싶은 마음';return;
 }
 const node=NODES[id]?.(state);if(!node)throw new Error(`알 수 없는 장면: ${id}`);
 state.nodeId=id;state.chapterTitle=node.title||state.chapterTitle;state.chatClosed=false;
 if(node.type==='chat')return startSceneChat(state,node.stage,node.next);
 if(node.type==='selectPersonal'||node.type==='selectRain'){
  state.phase=node.type;state.cast=[];state.active=null;return;
 }
 if(node.type==='choice'){
  state.phase='choice';state.choicePrompt=node.prompt;return;
 }
 state.cast=node.cast||[];state.sceneBg=node.background||state.sceneBg;
 const lines=node.lines.flatMap((l,i)=>{const normal={...l,...(i===0?{bg:state.sceneBg,cast:state.cast}:{})};const moment=momentAt(state,id,i);return moment?[{speaker:'',text:moment.caption,moment:moment.id},normal]:[normal];});
 setScript(state,lines,`flow:${node.next}`);record(state,lines[0]);
}
export function advanceNarrative(state){
 if(state.phase!=='story'||!state.after?.startsWith('flow:'))return false;
 if(state.line<state.script.length-1){state.line++;record(state,state.script[state.line]);}
 else enterNode(state,state.after.slice(5));
 return true;
}
export function chooseNarrative(state,index){
 if(state.phase!=='choice'||!Number.isInteger(index))return false;
 const o=choiceOptions(state)[index];if(!o)return false;
 const targets=o.all?Object.keys(HEROES):[o.hero||h(state)];
 for(const id of targets){if(!HEROES[id])continue;score(state,id,o.delta||0);if(o.event)addEvent(state,id,o.event);}
 state.lastChoiceDelta=o.delta||0;
 state.choiceHistory.push({node:state.nodeId,index,text:o.text});state.choiceHistory=state.choiceHistory.slice(-40);
 if(o.flag)state.flags[o.flag]=o.value;
 if(o.repair)state.flags.repaired=true;
 if(state.nodeId==='festival-hand'&&o.delta<0){state.flags.repaired=false;state.flags.repairUnderstanding=0;}
 state.history.push({speaker:state.name,text:o.text});
 enterNode(state,o.next);return true;
}
export function skipFirstConversations(state){
 if(state.phase!=='selectMeet')return false;
 state.flags||={};state.flags.firstChatsSkipped=state.done.length<Object.keys(HEROES).length;
 state.done=Object.keys(HEROES);state.active=null;state.chatStage=null;state.chatReturn=null;
 state.cast=[];state.lastChatInput='';state.chatDraft='';state.chatClosed=false;
 enterNode(state,'lunch');
 return true;
}
export function skipConversation(state){
 if(state.phase==='selectMeet')return skipFirstConversations(state);
 if(state.phase==='selectPersonal'){
  const remaining=Object.keys(HEROES).filter(id=>!state.personalDone.includes(id));
  state.flags.personalSkipped=[...new Set([...(state.flags.personalSkipped||[]),...remaining])];
  state.personalDone=Object.keys(HEROES);state.active=null;state.episodeHero=null;
  state.chatStage=null;state.chatReturn=null;state.chatDraft='';
  enterNode(state,'rain-intro');return true;
 }
 if(state.phase!=='chat'||state.chatClosed||!CHAT_STAGES[state.chatStage]||!HEROES[state.active])return false;
 const stage=state.chatStage,id=state.active;
 state.flags.skippedChats=[...new Set([...(state.flags.skippedChats||[]),`${id}:${stage}`])];
 state.chatClosed=true;state.chatDraft='';state.lastChatInput='';
 if(state.chatReturn)return endSceneChat(state,{skipped:true});
 if(stage==='meet'){
  if(!state.done.includes(id))state.done.push(id);
  state.flags.firstChatsSkipped=true;state.active=null;state.chatStage=null;state.cast=[];
  if(state.done.length===Object.keys(HEROES).length){
   enterNode(state,'lunch');
  }else state.phase='selectMeet';
  return true;
 }
 if(stage==='roof'){enterNode(state,'final');return true;}
 return false;
}
export function selectPersonal(state,id){
 if(state.phase!=='selectPersonal'||!HEROES[id]||state.personalDone.includes(id))return false;
 state.episodeHero=id;state.active=id;enterNode(state,'personal-start');return true;
}
export function selectRain(state,id){
 if(state.phase!=='selectRain'||!HEROES[id]||state.personalDone.length!==3)return false;
 state.routeHero=id;state.dateHero=id;state.active=id;state.flags.repaired=false;
 addEvent(state,id,'비 오는 날 주인공이 우산을 들고 자신을 찾아왔고, 다른 두 사람은 함께 연구실로 돌아갔다.');
 enterNode(state,'rain-arrival');return true;
}
const greetings={
 personal:{black:'아까 고른 머리핀, 제가 오래 봤다는 걸 어떻게 아셨어요? …오늘은 제 얘기도 더 해 보고 싶어요.',white:'린카는 여기 조금 더 있고 싶어. 바람 때문만은… 아니, {user}군도 할 말 있으면 해.',red:'조용해서 심심하지는 않으세요? 저는… 지금 속도가 좋은데.'},
 rain:{black:'…방이 조용하네요. 밖에서보다 {user}군 목소리가 더 가까운 것 같아요.',white:'린카는 비가 그칠 때까지만 있을 거야. …그동안은 둘이 얘기하면 되지.',red:'아직 비가 많이 오네요. 조금 더… 여기 있어도 되죠?'},
 repair:{black:'저도 {user}군이 어떤 마음으로 말했는지 듣고 싶어요. 이번에는 서로 끝까지 이야기해요.',white:'린카는 듣고 있어. 아까 일, 그냥 없던 걸로 넘기지는 말자.',red:'함께 있고 싶은 마음은 있어요. 제 생각도 말해도 되는 사이였으면 좋겠어요.'},
 festival:{black:'오늘 제가 평소보다 조용했죠? 긴장하면 저도 이렇게 되네요.',white:'린카는 오늘… 나쁘지 않았어. {user}군은 어땠는데?',red:'오늘은 제가 먼저 같이 있자고 말한 날로 기억하고 싶어요. {user}군은 어떤 장면이 남았어요?'},
 roof:ROOF_GREETINGS
};
export function startSceneChat(state,stage,next){
 const id=stage==='personal'?state.episodeHero:state.routeHero;
 state.active=id;state.cast=[id];state.chatStage=stage;state.chatReturn=next;
 state.lastChatInput='';state.phase='chat';state.chatClosed=chatTurns(state,id,stage)>=CHAT_STAGES[stage].limit;state.emotion=stage==='repair'?'sad':'neutral';
 if(stage==='roof'){state.intent=false;state.sceneBg=bg('옥상_노을');}
 state.reply=formatLine(greetings[stage][id],state.name);
 state.profiles[id].messages.push({role:'assistant',content:state.reply});
 state.history.push({speaker:HEROES[id].name,text:state.reply});
 if(stage==='rain')addEvent(state,id,'주인공 기숙사 방에서 단둘이 비를 피하며 이야기했다.');
 if(stage==='festival')addEvent(state,id,'단체 외출이 아닌 둘만의 축제 데이트를 했다.');
}
export function endSceneChat(state,{skipped=false}={}){
 if(state.phase!=='chat'||!state.chatClosed||!state.chatReturn)return false;
 const stage=state.chatStage,id=state.active,next=state.chatReturn;
 if(stage==='personal'&&!state.personalDone.includes(id)){state.personalDone.push(id);addEvent(state,id,{black:'처음 단둘이 산책하며 소품 가게에서 머리 장식을 골랐다.',white:'처음 둘이 옥상에서 시간을 보내고 다음에도 함께 오기로 했다.',red:'처음 단둘이 저녁 길을 걸으며 말없이 있어도 편한 시간을 보냈다.'}[id]);}
 if(!skipped&&stage==='repair')addEvent(state,id,state.flags.repaired?'서운했던 일을 서로 이야기하고 화해했다.':'서운했던 일을 이야기했지만 아직 조심스러운 거리가 남았다.');
 if(!skipped&&stage==='festival')addEvent(state,id,'축제가 끝난 뒤 다음에도 둘이 만나고 싶은 일들을 이야기했다.');
 if(!skipped&&stage==='roof')addEvent(state,id,'옥상에서 함께한 일들과 앞으로의 관계를 마지막으로 이야기했다.');
 state.chatReturn=null;state.chatStage=null;enterNode(state,next);return true;
}
export function sceneClosing(state){
 const id=state.active,stage=state.chatStage;
 return formatLine(({personal:{black:'이제 돌아갈까요? 오늘 고른 건 다음에 꼭 하고 나올게요.',white:'바람 차가워졌네. 내려가자. 린카가 다음에 또 오고 싶으면… 말할게.',red:'이제 돌아가요. 다음에도 이 길을 같이 걸으면 좋겠어요.'},rain:{black:'비가 잦아들었네요. 돌아가요. …오늘 얘기는 저도 기억할게요.',white:'비 그쳤네. 돌아가자. 아까 한 얘기, 린카는 기억할 테니까.',red:'…비가 그쳤어요. 돌아가는 길도 같이 걸어 주실 거죠?'},repair:{black:'오늘 이야기해 주셔서 고마워요. 이제 제 말도 조금은 닿았으면 좋겠어요.',white:'오늘은 여기까지 얘기하자. 린카가 한 말, 잊지 말고.',red:'들어 주셔서 고마워요. 다음에는 제 생각을 조금 더 먼저 말해 볼게요.'},festival:{black:'이제 돌아갈까요? 오늘은 집에 가는 길이 조금 아쉽네요.',white:'공연도 끝났네. 가자. 다음에 또 만나면 되니까.',red:'이제 불이 꺼지네요. 돌아가요. …오늘은 오래 기억하고 싶어요.'}})[stage]?.[id]||'',state.name);
}
export function progressLabel(state){
 if(state.storyRevision!==STORY_REVISION)return `이전 시나리오 · ${state.phase==='ending'?'엔딩':state.phase==='chat'?'대화 중':'진행 중'}`;
 if(state.phase==='ending'||state.after==='end')return state.ending==='bad'?'잊어버린 이름 · 배드엔딩':`${HEROES[state.ending]?.name||''} · 해피엔딩`;
 if(state.phase==='final')return '마지막 결정';
 if(state.phase==='chat'&&state.chatStage==='meet')return '첫 만남 · 서로 알아가는 중';
 return state.chapterTitle||'처음 만나는 마음';
}
