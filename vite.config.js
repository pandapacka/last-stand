import {defineConfig} from 'vite';
import {cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
function buildVersion(){
  const hash=createHash('sha256');
  function add(path){
    hash.update(path.replaceAll('\\','/')+'\0');
    hash.update(readFileSync(path));
  }
  function walk(dir){
    for(const entry of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){
      const path=join(dir,entry.name);
      if(entry.isDirectory())walk(path);else add(path);
    }
  }
  for(const file of ['index.html','package-lock.json','vite.config.js'])add(file);
  for(const dir of ['client','server','shared','assets'])walk(dir);
  return '0.32-'+hash.digest('hex').slice(0,6);
}
export default defineConfig({base:'./',publicDir:false,plugins:[{
  name:'legacy-runtime-assets',transformIndexHtml(html){return html.replaceAll('__BUILD_VERSION__',buildVersion())},async closeBundle(){await cp('assets','dist/assets',{recursive:true,filter:path=>!path.endsWith('.svg')})}
}]});