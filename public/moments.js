// Special CG catalog; importing this module has no storage or game side effects.
export const MOMENTS = {
  "black-date": {
    "id": "black-date",
    "hero": "black",
    "category": "date",
    "title": "고르는 마음",
    "caption": "소품 가게에서, 누군가를 챙기는 대신 자신의 마음을 고르던 순간.",
    "hint": "시오리와 소품 가게를 둘러보세요.",
    "image": "/assets/moments/black-date.png"
  },
  "black-rain": {
    "id": "black-rain",
    "hero": "black",
    "category": "umbrella",
    "title": "우산이 기울어진 쪽",
    "caption": "빗소리 사이로, 먼저 눈에 들어온 건 서로의 젖은 어깨였다.",
    "hint": "비 오는 날 시오리에게 우산을 가져가세요.",
    "image": "/assets/moments/black-rain.png"
  },
  "black-festival": {
    "id": "black-festival",
    "hero": "black",
    "category": "romance",
    "title": "먼저 내민 손",
    "caption": "평소보다 조심스러운 손끝이, 오늘은 먼저 내민 손에 닿았다.",
    "hint": "시오리와 축제에서 서로의 손을 잡아 보세요.",
    "image": "/assets/moments/black-festival.png"
  },
  "white-date": {
    "id": "white-date",
    "hero": "white",
    "category": "date",
    "title": "조금만 더 있다 가",
    "caption": "돌아가려던 소매를 붙잡은 손. 바람 때문이라는 말은 조금 늦게 나왔다.",
    "hint": "린카와 둘이 옥상에 올라가 보세요.",
    "image": "/assets/moments/white-date.png"
  },
  "white-rain": {
    "id": "white-rain",
    "hero": "white",
    "category": "umbrella",
    "title": "우산 아래의 변명",
    "caption": "좁은 우산 탓이라는 말과 달리, 어깨는 쉽게 멀어지지 않았다.",
    "hint": "비 오는 날 린카에게 우산을 가져가세요.",
    "image": "/assets/moments/white-rain-v2.png"
  },
  "white-festival": {
    "id": "white-festival",
    "hero": "white",
    "category": "romance",
    "title": "아직 놓지 않은 손",
    "caption": "귀신의 집은 이미 뒤에 있는데, 잡은 손은 그대로였다.",
    "hint": "린카와 축제에서 잡은 손을 놓지 마세요.",
    "image": "/assets/moments/white-festival-v2.png"
  },
  "red-date": {
    "id": "red-date",
    "hero": "red",
    "category": "date",
    "title": "돌아보는 저녁",
    "caption": "사람이 줄어든 길에서, 네무가 먼저 걸음을 늦추고 돌아보았다.",
    "hint": "네무와 조용한 저녁 길을 걸어 보세요.",
    "image": "/assets/moments/red-date.png?v=nemu3"
  },
  "red-rain": {
    "id": "red-rain",
    "hero": "red",
    "category": "umbrella",
    "title": "기다리던 답장",
    "caption": "문이 열리고 우산이 보이자, 기다리던 얼굴에 안도가 번졌다.",
    "hint": "비 오는 날 네무에게 우산을 가져가세요.",
    "image": "/assets/moments/red-rain.png?v=nemu3"
  },
  "red-festival": {
    "id": "red-festival",
    "hero": "red",
    "category": "romance",
    "title": "축제에서 조금 떨어져",
    "caption": "멀어진 공연 소리 대신, 서로에게 먼저 건넨 말과 손이 남았다.",
    "hint": "네무와 축제의 조용한 계단에서 손을 잡아 보세요.",
    "image": "/assets/moments/red-festival.png?v=nemu3"
  }
};
for(const [hero,title,caption] of [['black','돌아가기 전의 온도','다른 두 사람이 먼저 들어간 해질녘, 시오리와 잠깐 남아 함께 웃은 시간.'],['white','먼저 달려간 여름','모두 함께 나온 바다에서 먼저 놀자고 손짓하던 린카.'],['red','톡, 톡','셋을 찾던 주인공의 등을 두드리고, 수줍게 먼저 나타난 네무.']]){const id=`${hero}-ocean`;MOMENTS[id]={id,hero,category:'ocean',title,caption,hint:'세 히로인과 함께 바다에 가서 각자의 특별한 순간을 만나세요.',image:`/assets/moments/${id}.png`};}
for(const [hero,title,caption] of [['black','좋은 아침이에요, 남편','눈을 뜨자 곁에 있던 시오리가 조심스럽게 새 호칭을 물었다.'],['white','오늘은 일찍 들어와','같이 사는 아침, 린카의 툴툴거림 끝에 다정한 배웅이 남았다.'],['red','조금만 더','아침에 눈이 마주친 네무가 뒤에서 조용히 끌어안았다.']]){const id=`${hero}-happymorning`;MOMENTS[id]={id,hero,category:'morning',title,caption,hint:'서로의 마음을 확인하고 함께 사는 해피엔딩을 만나세요.',image:`/assets/moments/${id}.png`};}
export const MOMENT_CATEGORIES={date:'첫 데이트',umbrella:'우산 아래',romance:'축제 로맨스',ocean:'바다에서',morning:'함께 맞는 아침'};
export function mergeMomentUnlocks(...lists){return [...new Set(lists.flatMap(list=>Array.isArray(list)?list:[]).filter(id=>typeof id==='string'&&Object.hasOwn(MOMENTS,id)))];}
export function momentAt(state,nodeId,index){
 const id=nodeId==='personal-start'?state.episodeHero:state.routeHero;
 if(!id)return null;
 if(nodeId==='personal-start'&&index===({black:3,white:2,red:3})[id])return MOMENTS[`${id}-date`];
 if(nodeId==='rain-arrival'&&index===2)return MOMENTS[`${id}-rain`];
 if(nodeId==='festival-reply'&&index===0&&state.flags.handHeld===true&&state.lastChoiceDelta>0)return MOMENTS[`${id}-festival`];
 return null;
}
export function rememberMoment(state,id){if(!Object.hasOwn(MOMENTS,id))return false;const before=state.viewedMoments||[];if(before.includes(id))return false;state.viewedMoments=mergeMomentUnlocks(before,[id]);return true;}
