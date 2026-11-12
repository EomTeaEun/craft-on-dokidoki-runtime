import {HEROES,bg,cg,ENDINGS} from './data.js';
import {MOMENTS} from './moments.js';
export const ENDING_REVISION=7;
export const MODERN_ENDINGS={
 black:{title:'좋은 아침이에요',tag:'SHI-01 · HAPPY END',image:MOMENTS['black-happymorning'].image,caption:'같이 살게 된 뒤, 눈을 뜨니 시오리가 곁에 있었다.'},
 white:{title:'오늘은 일찍 들어와',tag:'RIN-03 · HAPPY END',image:MOMENTS['white-happymorning'].image,caption:'툴툴거리면서도 문 앞까지 따라 나오는 아침.'},
 red:{title:'조금만 더',tag:'NEM-02 · HAPPY END',image:MOMENTS['red-happymorning'].image,caption:'말보다 먼저, 등 뒤에서 닿아 온 온기.'},
 normal:{title:'로봇은 로봇일 뿐',kind:'normal',tag:'NORMAL END',image:bg('대학교_복도'),subtitle:'연구는 끝났다. 나는 내 생활로 돌아갔다.',caption:'관계 기억은 남았지만 함께 살지 않기로 했다. 복도 끝에서 연구를 마무리했다.'},
 bad:{title:'또 다시 혼자',tag:'BAD END',image:bg('대학교_복도'),caption:'관계 기억은 지워지고, 함께했던 시간은 나에게만 남았다.'}
};
for(const hero of ['black','white','red']){
 MODERN_ENDINGS[hero].hero=hero;MODERN_ENDINGS[hero].kind='cohabit';MODERN_ENDINGS[hero].subtitle='눈을 뜨면, 곁에 있는 사람.';

}

MODERN_ENDINGS.bad.kind='bad';MODERN_ENDINGS.bad.image=bg('연구실_낮');MODERN_ENDINGS.bad.subtitle='기록은 남았다. 관계는 지워졌다.';
const line=(speaker,text,extra={})=>({speaker,text,...extra});

// 아침 일러스트 직전 검은 화면 대사. black=시오리, white=린카, red=네무. 한 line이 한 턴입니다.
export const BEFORE_MORNING_LINES = {
 black:[
  line('나','시오리와 함께 살기 시작한 뒤로, 매일 밤 잘 자라는 인사를 듣게 됐다.'),
  line('나','별것 아닌 한마디인데, 그 말을 듣고 나면 조금 마음이 놓였다.'),
  line('나','그러고 보니, 아침이 기다려지는 건 처음이었다.'),
 ],
 white:[
  line('나','린카와 함께 사는 집은, 아침부터 조용할 틈이 없었다.'),
  line('나','오늘도 눈을 뜨기 전부터 익숙한 목소리가 들려왔다.'),
 ],
 red:[
  line('나','네무는 이제 내 앞에서 고개를 숙이는 일이 줄었다.'),
  line('나','먼저 눈을 맞추거나, 말없이 내 옆에 앉는 날도 많아졌다.'),
  line('나','가까워지는 데에도, 우리만의 속도가 있었다.'),
 ],
};

export function endingLines(state,id){
 if(id==='bad')return [
  line('교수','관계 기억의 초기화를 진행하겠습니다.아마 기본 성격과 기능은 유지 될겁니다.',{bg:cg('04_MEMORY_RESET'),cast:[]}),
  ...ENDINGS.bad.lines.map(([speaker,text],i)=>line(speaker,text,i===0?{bg:bg('연구실_낮'),cast:['white','black','red']}:{ })),
  line('','... 함께했던 날들을 기억하는 사람은 나뿐이었다.',{cast:[]})
 ];
 if(id==='normal')return [
  line('','연구실 문을 닫고 복도로 나왔다. 사람들은 평소처럼 내 옆을 지나갔다.',{bg:bg('대학교_복도'),cast:[]}),
  line('','교수님께는 후속 연구에 참여하지 않겠다고 전했다.'),
  line('나','내가 맡은 일도 여기까지구나...'),
  line('나','로봇은 로봇일 뿐이다. 같이 산다고 해서 뭔가 달라지는 건 없을 것이다. 영원히'),
  line('나','…이제 연구를 마쳐야지.'),
  line('','그렇게 생각하며, 나는 연구실 문을 닫았다.',{cast:[]})
 ];
 const accept={black:'{user}군과 함께라면  ',white:'하? 린카랑 {user}군이 한집에?!',red:'저는...좋아요...'}[id];
 const intro=[
  line(id,accept,{bg:bg('연구실_낮'),cast:[id],emotion:'shy'}),
  line('','후속 연구는 3년간 지원을 받게 되었다.'),
  line('','다른 두 사람도 기억을 잃지 않은 채 연구실에 남았다.'),
  line('','우리는 학교 근처의 작은 집에서 함께 살기 시작했다.'),
 ];
 const morning={
  black:[
   line('','어느 아침, 방에서 나오니 식탁 앞에 시오리가 있었다.',{bg:bg('기숙사방'),cast:['black'],expressions:{black:'love'}}),
   line('black','깨셨어요?',{emotion:'happy'}),
   line('나','응… 언제 일어났어?'),
   line('black','조금 전에요.',{emotion:'shy'}),
   line('black','{user}군. 여쭤보고 싶은게 생겼어요.',{emotion:'love'}),
   line('','시오리는 작은 목소리로 말했다.'),
   line('black','저희는...그게, 같이 사는 사이니까 부부...나 다름 없잖아요?',{emotion:'love'}),
   line('black','그러니까... 남편이라 불러도 될까요?',{emotion:'love'}),
   line('나','?'),
   line('black','...싫으세요?'),
   line('나','아니야, 그렇게 불러 줘.'),
   line('','시오리가 가까이서 웃었다.'),
   line('black','그럼… 좋은 아침이에요, 여보.',{emotion:'love'})
  ],
  red:[
   line('','어느 아침, 방에서 나오니 식탁 앞에 네무가 있었다.',{bg:bg('기숙사방'),cast:['red'],expressions:{red:'love'}}),
   line('red','…일어나셨어요?',{emotion:'happy'}),
   line('','식탁 위에는 간단한 아침 식사가 놓여 있었다.'),
   line('나','응. 뭔가 열심히 준비했네.'),
   line('red','네! 오늘은… 같이 살게 된 기념으로, 아침을 준비했어요.',{emotion:'love'}),
   line('나','고마워. 일단 옷부터 갈아입고 올게.'),
   line('','방 쪽으로 가려는데, 뒤에서 두 팔이 허리를 감았다.',{cast:[]}),
   line('나','네무?'),
   line('red','잠깐만요.'),
   line('','등에 볼이 살짝 닿았다. 나는 그녀의 손 위에 손을 겹쳤다.'),
   line('red','…조금만 더 이러고 있을래요.')
  ],
  white:[
   line('','눈을 뜨니 린카가 방문 앞에 서있었다.',{bg:bg('기숙사방'),cast:['white'],expressions:{white:'shy'}}),
   line('white','이제 일어났어? 몇 번을 불러야 해.',{emotion:'jealous'}),
   line('나','일찍 일어났네.'),
   line('white','네가 늦장 부릴까 봐 그런 거야.',{emotion:'shy'}),
   line('','잠시 뒤, 나가려는데 린카가 문 앞까지 따라왔다.'),
   line('나','다녀올게.'),
   line('white','오늘은 일찍 들어와야 해.',{emotion:'shy'}),
   line('나','기다리려고?'),
   line('white','집에 린카 혼자 있으면 심심하니까. 그뿐이야.',{emotion:'jealous'}),
   line('','문을 닫기 전, 조금 작은 목소리가 들렸다.'),
   line('white','…조심히 다녀와.',{emotion:'love'})
  ]
 }[id];
 const moment=`${id}-happymorning`;
 const beforeMorning=BEFORE_MORNING_LINES[id].map(l=>({...l,bg:'/assets/backgrounds/black.svg',cast:[],blackout:true}));
 return [...intro,...beforeMorning,...morning.map(l=>({...l,bg:MOMENTS[moment].image,cast:[],moment,cgMode:'dialogue'}))];
}