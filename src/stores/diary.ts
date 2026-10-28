import { ref } from 'vue';
import { defineStore } from 'pinia';
import { createStore, createRepository, type DiaryState } from '../domain/model';
export const useDiary = defineStore('diary', () => {
  const KEY = 'sprout-diary-v1';
  const repository=createRepository({read:()=>uni.getStorageSync(KEY)||null,write:s=>uni.setStorageSync(KEY,s)});
  const state = ref<DiaryState>(JSON.parse(JSON.stringify(repository.state)));
  const error = ref(repository.error);
  function run<T>(action: (store: ReturnType<typeof createStore>) => T): T {
    const result = repository.run(action); state.value = JSON.parse(JSON.stringify(repository.state)); return result;
  }
  function recover(action:(store:ReturnType<typeof createStore>)=>void){repository.recover(action);state.value=JSON.parse(JSON.stringify(repository.state));error.value=repository.error;}
  function backup(){return repository.backup();}
  return { state, error, run, recover, backup };
});
