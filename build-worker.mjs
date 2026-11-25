import {mkdir,rm,cp} from "node:fs/promises";
await rm("dist",{recursive:true,force:true});
await mkdir("dist",{recursive:true});
for(const path of ["index.html","manifest.webmanifest","sw.js","assets"]){
 await cp(path,"dist/"+path,{recursive:true});
}
