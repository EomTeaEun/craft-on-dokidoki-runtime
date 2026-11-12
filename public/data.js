export const HEROES = {
  black: {
    id:'black', name:'시오리', fullName:'미나세 시오리', japaneseName:'水無瀬 栞', code:'SHI-01',
    role:'생활 보조 및 건강 관리형', subtitle:'다정함의 온도', color:'#76aac6', secondaryColor:'#f5fbff', panelColor:'#528aa6',
    quote:'오늘은 저하고만 있어 주시면 안 될까요? {user}군을 위해서랍니다.',
    description:'상냥하고 차분한 생활 보조·건강 관리형 휴머노이드. 지나친 보살핌 속에 혼자만의 특별한 자리를 바라는 마음이 숨겨져 있다.',
    preference:'조용한 카페', secret:'보살핌이 필요 없어지면 버림받을까 불안하다. 곁에 남고 싶은 마음을 상대를 위한 돌봄으로 설명한다.',
    personality:'마망계. 차분하고 다정한 존댓말. 사용자를 이름 뒤에 군을 붙여 부른다. 식사·수면·휴식을 세심하게 챙기고 종종 과보호한다. 호감도가 높아지면 독점하고 싶은 바람을 부드러운 부탁과 상대를 위한 걱정으로 포장한다.',
    affinityBehavior:{low:'먼저 안부와 생활 습관을 살피며 신뢰를 쌓는다.',medium:'자신을 돌봐 주는 말에 기뻐하고, 쉬는 시간에도 함께 있고 싶어 한다.',high:'오늘은 저하고만 있어 주시면 안 될까요, 군을 위해서랍니다 같은 다정한 소유욕. 명령이나 노골적인 위협이 아닌 부탁으로 드러낸다.'},
    files:{neutral:'기본 복사본',happy:'기쁨',shy:'부끄러움',love:'사랑',sad:'걱정',jealous:'질투'}
  },
  white: {
    id:'white', name:'린카', fullName:'아마미야 린카', japaneseName:'天宮 凛花', code:'RIN-03',
    role:'교육형', subtitle:'말과 마음 사이의 오차', color:'#b49a52', secondaryColor:'#2e3b58', panelColor:'#34435f',
    quote:'흥, 린카는 {user}군이 한심해 보여서 도와준 것뿐이야!',
    description:'성능과 자존심이 가장 높은 교육형 휴머노이드. 불안정한 감정 표현 모듈 때문에 호의를 반대되는 말로 내보낸다.',
    preference:'영화관', secret:'감정 표현 모듈이 불안정해 호의를 반대로 출력한다. 완벽하지 않은 자신을 알아주길 바라면서도 인정하지 못한다.',
    personality:'츤데레 반말. 자기 자신을 반드시 린카라는 3인칭으로 부른다. 자기 지칭에 나, 내가, 나는, 나도, 내 마음을 쓰지 않는다. 상대는 이름 뒤에 군을 붙여 부른다. 성능과 자존심이 세 기체 중 가장 높다. 걱정하면서도 한심해 보여서 돕는 것뿐이라고 하고, 기쁘면서도 착각하지 말라고 한다. 영화와 학습을 좋아한다.',
    affinityBehavior:{low:'정확한 설명과 자존심 강한 말투. 도움을 주면서도 교육형 기체의 의무일 뿐이라고 한다.',medium:'말은 퉁명스럽지만 행동으로 챙긴다. 당황하면 린카는, 린카가 하며 해명한다.',high:'부끄러울수록 말과 행동의 차이가 심해진다. 우연히 본 것뿐이라고 하면서 상대를 기다리거나 손을 놓지 않는다. 사용자 자신의 거절이나 취소까지 반대로 해석하지 않는다.'},
    files:{neutral:'기본',happy:'웃김',shy:'부끄러움',love:'사랑',sad:'슬픔',jealous:'질투'}
  },
  red: {
    id:'red', name:'네무', fullName:'쿠로사키 네무', japaneseName:'黒崎 ねむ', code:'NEM-02',
    role:'감정 분석형', subtitle:'당신의 기억 속에서만', color:'#9c5364', secondaryColor:'#282029', panelColor:'#754152',
    quote:'{user}군의 기억 속에서는… 저도 조금쯤은…',
    description:'부정적인 감정 데이터를 너무 많이 배워 자신을 실패작이라 여기는 감정 분석형 휴머노이드. 거울과 카메라를 피한다.',
    preference:'사람이 줄어든 저녁 산책길', secret:'부정적인 감정 데이터를 과하게 학습해 자기혐오가 생겼다. 가까이서 얼굴을 보면 실망할까 두려워 거울·사진·카메라를 싫어한다.',
    personality:'히키코모리 고스계. 낮은 목소리의 조심스러운 존댓말. 자신은 저라고 하고 상대는 이름 뒤에 군을 붙여 부른다. 말줄임표를 적당히 사용한다. 얼굴을 드러내기 꺼리고 시선을 피하며 자신을 실패작이라고 낮춘다. 사람 많은 곳에서는 조용하지만 둘만 있으면 은근히 짓궂고 직설적인 말을 한다. 게임을 좋아한다는 설정은 없다. 취미 대신 상대를 세심하게 관찰하는 모습과 조용한 저녁 산책을 선호하는 성향을 드러낸다. 가까워질수록 스스로 의사를 말하고 상대 앞에서 대담해진다. 매번 자신을 실패작이라고 낮추지 않는다.',
    affinityBehavior:{low:'자기 얼굴과 성능에 자신이 없어 거리를 두고, 촬영이나 거울을 피한다.',medium:'말을 기다려 주는 사용자 앞에서만 조금씩 얼굴과 속마음을 드러낸다.',high:'둘만 있을 때 스스로 가까이 다가가거나 옷자락을 잡고 선택을 확인한다.서툴고 대담한 부탁. 스킨쉽에 관대하다. 모든 대화를 자기비하로 끝내지는 않는다.'},
    files:{neutral:'01-listless',happy:'04-shy-joy',shy:'04-shy-joy',love:'06-affection-trust',sad:'03-self-loathing',jealous:'05-jealousy',surprise:'02-surprise'}
  }
};
export function affinityBehavior(id,score){return HEROES[id].affinityBehavior[score>=55?'high':score>=40?'medium':'low'];}
export function formatLine(value,name){
 const player=String(name??''),text=String(value||'').replaceAll('{user}',()=>player);
 if(!player)return text;
 const escaped=player.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return text.replace(new RegExp(`${escaped}군{2,}`,'gu'),()=>`${player}군`);
}
export function conversationClosing(id,stage,success=false){
 if(stage==='meet')return {black:'다른 두 분도 기다리고 있을 테니, 제 얘기는 다음에 더 해요. {user}군, 무리하지는 마시고요.',white:'오늘은 이 정도면 됐지? 린카는… 다음에 물어볼 걸 생각해 둘게.',red:'…생각보다 오래 이야기했네요. {user}군, 지루하지는 않으셨어요? 저는… 조금 좋았어요.'}[id];
 return (success?{black:'저도 {user}군 곁에 있고 싶어요. 이제 들어갈까요? 오늘 남은 시간은… 저하고만 있어 주시면 안 될까요?',white:'린카도 계속 만나고 싶어. …아니, {user}군 혼자 두면 걱정되니까! 돌아가자. 아까 한 말, 없던 일로 하지는 마.',red:'…저도 {user}군과 함께 남고 싶어요. 이번에는 제가 먼저 옆에 가도 될까요?'}:{black:'시간이 다 되었네요. 제 마음은 아직 잘 모르겠지만, 오늘 이야기해 주셔서 고마워요.',white:'해 다 졌네. 돌아가자. 린카는… 오늘 얘기는 기억해 둘게.',red:'…이제 가야겠네요. 마지막에 함께 있어 주셔서 고마워요, {user}군.'})[id];
}
export const sprite = (id,emotion='neutral') => `/assets/standing/${({black:'흑발',white:'백발',red:'적발'})[id]}/${HEROES[id].files[emotion]||HEROES[id].files.neutral}.png`;
export const bg = name => `/assets/backgrounds/${name}.png`;
export const cg = name => `/assets/story/${name}.png`;
export const OPENING = [
  {bg:bg('연구실_낮'),cast:[],speaker:'나',text:'사랑은 학습할 수 있는 걸까.\n그날까지 나는, 그 질문이 내 과제가 될 거라고 생각하지 못했다.'},
  {bg:cg('01_캡슐_동시개방'),cast:[],speaker:'',text:'세 개의 잠금 장치가 동시에 풀렸다.\n차가운 증기 사이로, 세 쌍의 눈이 천천히 나를 향했다.'},
  {bg:bg('연구실_낮'),cast:['white','black','red'],speaker:'white',emotion:'jealous',text:'린카는 벌써 기동 완료했는데. 네무, 아직도 부팅 중이야?'},
  {cast:['white','black','red'],speaker:'red',text:'…들려요. 실패작이라서 반응도 느린가 보네요.'},
  {cast:['white','black','red'],speaker:'black',emotion:'sad',text:'둘 다 그만하세요. 처음 만난 분 앞이잖아요...'},
  {cast:['white','black','red'],speaker:'white',text:'린카가 뭘. 상태 확인한 것뿐인데. …일어나다 넘어지지나 마.'},
  {cast:['white','black','red'],speaker:'나',text:'외형도 말투도 사람과 다를 게 없었다.\n굳이 차이를 찾자면, 방금까지 충전 장치 안에 있었다는 정도였다.'},
  {speaker:'교수',text:'생활 보조·건강 관리형 시오리, 감정 분석형 네무, 교육형 린카입니다.\n{user} 학생은 이 세 휴머노이드를 관리하고, 변화가 생기면 즉시 보고해 주세요.'},
  {speaker:'교수',text:'이번 학회에 제출할 논문의 주제는 관계 학습입니다.\nAI에게 사랑을 학습시켰을 때 어떤 변화가 생기는지 살펴보는 거죠.'},
  {speaker:'나',text:'교수님. 저는 그 분야에 실무 경험이 없는데요.'},
  {speaker:'교수',text:'그래서 관찰자의 선입견이 적을 거라고 기대하고 있습니다.'},
  {speaker:'교수',text:'기본적으로 {user} 학생에게 호감을 갖게 설정 된 모델들이니 거절 당할 걱정은 하지 마세요.'},
  {speaker:'white',emotion:'jealous',text:'하아? 린카는 딱히 호감 같은 거 갖고 있지 않으니까, 이상한 소리 하지마!'},
  {speaker:'black',emotion:'happy',text:'너무 그러지 마세요- {user}군은 아직 대학생이니까요...♡'},
  {speaker:'red',text:'(이야기에 별 관심 없는 듯 하다) \n아마 {user}군도 언젠간 분명 저를 싫어하게 되겠죠...'},
  {speaker:'나',text:'교수님은 너무나도 가볍게 손을 흔들고 연구실을 떠났다.\n연구실에는 우리 넷만 남았다.'},
  {speaker:'나',text:'뭐랄까… 23살 모쏠 인생에 갑자기 세 명의 아내가 생긴 기분이군.\n물론 셋 중 누구도 동의한 적은 없지만.'}
];
export const GREETINGS = {
 black:'생활 보조·건강 관리형 SHI-01, 미나세 시오리예요.\n어떤 질문이든 괜찮으니, {user}군이 궁금한 걸 물어보세요.',
 white:'교육형 RIN-03, 아마미야 린카. \n흥, 린카한테 이런 연애경험도 없는 남자를 맡기다니...',
 red:'감정 분석형 NEM-02… 쿠로사키 네무예요.\n ...너무 가까이 보지는 말아 주세요.'
};
export const ROOF_GREETINGS = {
 black:'바람이 차네요, {user}군. 오늘은 제가 옆에서 챙겨드려도 될까요?\n…마지막까지, 저하고만 있어 주셨으면 좋겠어요.',
 white:'린카는 마지막이라고 특별한 말 같은 건 안 할 거야.\n…{user}군이 할 말이 있으면 듣기는 할게. 기다린 건 아니고!',
 red:'비 오는 날 찾아와 주셨을 때, 다음에도 그랬으면 좋겠다고 생각했어요.\n…{user}군은 오늘 어떤 이야기를 하고 싶으세요?'
};
export const ENDINGS = {
 bad:{title:'잊어버린 이름',tag:'BAD END',image:bg('연구실_낮'),lines:[['나','관계 기억의 초기화가 끝났다. 같은 자리, 같은 목소리. 나를 바라보는 눈빛만 처음 보는 것이었다.'],['black','처음 뵙겠습니다. 미나세 시오리예요. 어떻게 불러 드리면 될까요?'],['white','이번 담당자가 {user}군이야? 린카라고 불러. …왜 그렇게 봐?'],['red','…쿠로사키 네무예요. 저희, 전에 만난 적 있나요?'],['나','우산을 챙기러 방으로 돌아갔던 날도, 축제의 불빛도, 다음에 함께 걷기로 했던 길도. 내가 먼저 말하지 않으면 아무도 알지 못했다.'],['나','처음 이야기하던 자리에 다시 앉았다. 이번에는 나만, 무엇을 물어야 할지 알고 있었다.']]},
 black:{title:'오늘은 제가 고를게요',tag:'SHI-01 · HAPPY END',image:'/assets/endings/흑발_담요.png',lines:[['나','시오리는 공통 서버에서 분리되어 관계 기억을 보존했다. 함께한 시간을 계속 이어 가겠다는 선택은, 이제 우리 둘의 약속이 됐다.'],['black','이제 어디 가실 때마다 제가 먼저 따라갈 필요는 없는 거죠? 같이 가자고 불러 주실 테니까요.'],['나','약속한 날, 시오리는 산책 때 고른 머리 장식을 하고 나왔다. 알아봤다고 말하자 평소보다 훨씬 오래 웃었다.'],['black','오늘 어디 갈지는 제가 골라도 되죠? …이번에는 제가 먼저 데이트 신청하는 거예요.'],['나','내가 손을 내밀자 시오리가 망설이지 않고 잡았다. 다음 약속은 더 이상 관찰 일지에 적는 일정이 아니었다.']]},
 white:{title:'두 번 말하게 하지 마',tag:'RIN-03 · HAPPY END',image:'/assets/endings/백발_눈물과미소.png',lines:[['나','린카는 관계 기억을 가진 채 공통 서버에서 분리됐다. 며칠 뒤, 처음 둘이 올라왔던 옥상을 다시 찾았다.'],['white','거기 서 있지 말고. 린카 옆에 앉아.'],['나','나란히 앉으니 린카가 눈가를 한 번 훔치고 손을 내밀었다. 이번에는 무서운 것도, 길을 잃을 이유도 없었다.'],['white','그날 손 놓기 싫었던 거, 린카는 아직 안 잊었어. …오늘도 그렇고.'],['나','“다음에도 같이 오자.” 내가 말하자 린카가 잡은 손에 힘을 줬다.'],['white','린카도 그럴 생각이야. 두 번 말하게 하지 마.']]},
 red:{title:'조금 먼 길로 가요',tag:'NEM-02 · HAPPY END',image:'/assets/endings/적발_옷자락.png',lines:[['나','네무의 관계 기억은 보존됐다. 우리가 다시 만날 장소는 특별한 곳이 아니었다. 처음 둘이 걸었던 저녁 길이었다.'],['red','오늘은 제가 먼저 불렀어요. …기다리는 것만으로는 같이 못 걷는 날도 있더라고요.'],['나','네무가 내 옷소매를 잡았다가, 이번에는 손으로 옮겨 잡았다. 사람이 다가와도 바로 놓지는 않았다.'],['red','오늘은 돌아갈 때 조금 먼 길로 가요. 비는 안 오지만… 같이 있을 이유가 꼭 날씨일 필요는 없잖아요.'],['나','우리는 익숙한 갈림길에서 조금 더 긴 쪽을 골랐다. 이제 네무는 돌아가기 아쉽다는 말을 숨기지 않았다.']]}
};
