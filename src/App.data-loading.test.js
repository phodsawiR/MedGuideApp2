import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {onSnapshot,getDocs} from 'firebase/firestore';

jest.mock('firebase/app',()=>({initializeApp:()=>({})}));
jest.mock('firebase/analytics',()=>({getAnalytics:()=>({}),logEvent:jest.fn()}));
jest.mock('firebase/auth',()=>({getAuth:()=>({}),signInAnonymously:jest.fn(async()=>{}),signInWithCustomToken:jest.fn(async()=>{}),onAuthStateChanged:(auth,fn)=>{fn({uid:'guest'});return ()=>{};}}));
jest.mock('firebase/firestore',()=>({
  getFirestore:()=>({}),collection:(db,...p)=>p.join('/'),doc:(db,...p)=>p.join('/'),query:ref=>ref,orderBy:()=>null,
  onSnapshot:jest.fn((ref,fn)=>{fn({docs:[],exists:()=>false});return jest.fn();}),
  getDocs:jest.fn(async()=>({docs:[]})),writeBatch:()=>({set:jest.fn(),delete:jest.fn(),commit:jest.fn(async()=>{})}),
  setDoc:jest.fn(),addDoc:jest.fn(),updateDoc:jest.fn(),deleteDoc:jest.fn(),where:jest.fn(),serverTimestamp:jest.fn()
}));
jest.mock('./components/ACPractice',()=>()=>null);
jest.mock('./components/QuizBank',()=>({QuizBank:()=>null}));
jest.mock('./components/TopicCard',()=>({TopicCard:()=>null}));
jest.mock('./components/AIQuizModal',()=>({AIQuizModal:()=>null}));
jest.mock('./components/ClinicalCalculatorView',()=>({ClinicalCalculatorView:()=>null}));
jest.mock('./components/PocketGuideView',()=>({PocketGuideView:()=>null}));

let host,root;
beforeEach(()=>{global.IS_REACT_ACT_ENVIRONMENT=true;window.scrollTo=jest.fn();window.history.replaceState(null,'','/');jest.clearAllMocks();onSnapshot.mockImplementation((ref,fn)=>{fn({docs:[],exists:()=>false});return jest.fn();});getDocs.mockResolvedValue({docs:[]});host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(()=>{act(()=>root.unmount());host.remove();});
const mount=async hash=>{window.history.replaceState(null,'','/'+hash);await act(async()=>root.render(<App/>));};
const route=async hash=>{await act(async()=>{window.history.replaceState(null,'','/'+hash);window.dispatchEvent(new Event('hashchange'));});};
test('explicit quiz entry reads only quizzes; no study-card reads/cleanup/progress listeners',async()=>{
  await mount('#quiz');expect(window.location.hash).toBe('#quiz');
  expect(onSnapshot.mock.calls.map(c=>c[0])).toEqual(['quizzes']);expect(getDocs).not.toHaveBeenCalled();
  const practiceLinks=[...host.querySelectorAll('a[href*="/quiz/practice"]')];expect(practiceLinks).toHaveLength(3);
  practiceLinks.forEach(a=>expect(a.hasAttribute('target')).toBe(false));
});
test('AC entry does not read quiz or study-card collections',async()=>{
  await mount('#ac-usmle');expect(onSnapshot).not.toHaveBeenCalled();expect(getDocs).not.toHaveBeenCalled();
});
test('opening cards starts their data; returning to quiz unsubscribes card listeners',async()=>{
  await mount('#quiz');const quizUnsubscribe=onSnapshot.mock.results[0].value;
  await route('#knowledge');expect(quizUnsubscribe).toHaveBeenCalledTimes(1);
  const cardCalls=onSnapshot.mock.calls.map((c,i)=>({ref:c[0],unsubscribe:onSnapshot.mock.results[i].value})).filter(c=>c.ref!=='quizzes');
  expect(cardCalls.map(c=>c.ref)).toEqual(['artifacts/medguide-master-db/public/data/topics','artifacts/medguide-master-db/users/guest/data/progress']);
  expect(getDocs).toHaveBeenCalledTimes(1);await route('#quiz');
  cardCalls.forEach(c=>expect(c.unsubscribe).toHaveBeenCalledTimes(1));expect(getDocs).toHaveBeenCalledTimes(1);
  expect(onSnapshot.mock.calls.at(-1)[0]).toBe('quizzes');
});

test('guest homepage exposes OSCE flashcard links without loading private progress',async()=>{
  await mount('');expect(window.location.hash).toBe('#home');
  expect([...host.querySelectorAll('a[href="/osce-med/"]')]).toHaveLength(2);
  expect(onSnapshot).not.toHaveBeenCalled();expect(getDocs).not.toHaveBeenCalled();
});
