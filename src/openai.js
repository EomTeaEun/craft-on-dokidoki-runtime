import {createOpenAI} from '@ai-sdk/openai';

export const DEFAULT_MODEL='gpt-5.4-mini';
export function aiStatus(env=process.env){
 return {provider:'openai',liveReady:!!env.OPENAI_API_KEY?.trim(),model:env.OPENAI_MODEL?.trim()||DEFAULT_MODEL};
}
export function createGameModel({env=process.env,fetch}={}){
 const provider=createOpenAI({apiKey:env.OPENAI_API_KEY,baseURL:'https://api.openai.com/v1',...(fetch?{fetch}:{})});
 return provider.responses(aiStatus(env).model);
}
export function gameProviderOptions(env=process.env){
 return {openai:{store:false,...(aiStatus(env).model===DEFAULT_MODEL?{reasoningEffort:'none'}:{})}};
}
