import {defineConfig} from 'vite';
import {cp} from 'node:fs/promises';
export default defineConfig({base:'./',publicDir:false,plugins:[{
  name:'legacy-runtime-assets',async closeBundle(){await cp('assets','dist/assets',{recursive:true,filter:path=>!path.endsWith('.svg')})}
}]});