// Shared by the browser and API: scene limits and context must agree.
export const CHAT_STAGES = {
 meet:{limit:8,label:'처음 만나는 마음',context:'연구실에서 처음 알아가는 첫날. 아직 외출·연애·초기화 위기는 겪지 않았다.',cap:16},
 personal:{limit:6,label:'둘이 있으면 다른 얼굴',context:'처음 약속한 단둘의 외출. 시오리는 소품 가게에서 머리 장식을 골랐고, 린카는 옥상에서 더 머물자고 했고, 네무는 사람이 줄어든 저녁 길을 함께 걸었다. 자신에게 해당하는 사건만 기억한다. 아직 메인 연애 상대를 정하지 않았다.',cap:8},
 rain:{limit:6,label:'비가 그칠 때까지',context:'비 오는 날 사용자가 우산을 들고 너를 찾아왔다. 다른 두 사람은 함께 연구실로 돌아갔다. 너와 사용자만 그의 기숙사 방에서 젖은 겉옷을 말리며 비를 피한다. 왜 자신을 찾아왔는지 궁금하다. 아직 연인이나 고백 수락이 확정된 것은 아니다.',cap:6},
 repair:{limit:6,label:'어제와 다른 거리',context:'비 오는 날 이후 가까워졌으나 작은 갈등이 생겼다. 시오리는 자신을 누구에게나 다정한 사람이라고만 여긴 말, 린카는 둘만의 부끄러운 일을 남 앞에서 이야기한 일, 네무는 묻지 않고 외출 장소를 바꾼 일로 서운했다. 자신의 해당 사건만 다룬다. 상대가 이해하고 설명하면 점진적으로 화해한다. 한 번의 서툰 대답으로 끝내지 않는다.',cap:6},
 festival:{limit:6,label:'이번에는 데이트',context:'서로 데이트라고 부르고 학교 축제를 둘이 찾았다. 시오리는 사용자가 먼저 잡은 손에 당황했고, 린카는 귀신의 집을 나와서도 손을 놓기 싫어했고, 네무는 조용한 계단에서 손을 잡아도 되는지 물었다. 사용자의 실제 선택은 사건 기억을 우선한다. 오늘 있었던 일과 다음 약속을 이야기한다. 아직 초기화 위기는 모른다.',cap:6},
 roof:{limit:10,label:'다음에도 함께',context:'축제 뒤 일상에서 기억이 끊기는 증상을 발견했다. 초기화가 예정되어 마지막으로 노을 지는 옥상에서 대화한다. 한 기체는 공통 서버에서 분리해 관계 기억을 보존할 수 있다. 사용자가 비 오는 날 정한 상대는 너다. 실제 사건 기억과 다음 약속을 회상한다.',cap:15}
};
export const chatLimit = stage => CHAT_STAGES[stage]?.limit || 8;
export const chatTurns = (state,id=state.active,stage=state.chatStage) => {
 const p=state.profiles[id];
 return stage==='meet'?p.meetTurns:stage==='roof'?p.roofTurns:p.stageTurns?.[stage]||0;
};
