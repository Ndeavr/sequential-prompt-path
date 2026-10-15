import { prepareDesignPhoto } from './photo';
import { uploadAlexFile } from '@/services/alexUploadService';

export interface DesignChatContext {
  before: File;
  after: File;
  beforeUrl: string;
  afterUrl: string;
  description: string;
  roomType: string | null;
  versionId: string;
  uploadedIds?: { beforeFileId?: string; afterFileId?: string };
}

async function photo(source: string, name: string): Promise<File> {
  const response=await fetch(source);
  if(!response.ok)throw new Error('Impossible de charger votre photo. Réessayez.');
  const blob=await response.blob();
  const prepared=await prepareDesignPhoto(new File([blob],name,{type:blob.type}));
  return new File([prepared],name,{type:prepared.type});
}

export async function prepareDesignChat(original: string, result: string, description: string, roomType: string | null, versionId: string): Promise<DesignChatContext> {
  const [before,after]=await Promise.all([photo(original,'Avant — photo actuelle.jpg'),photo(result,'Après — concept IA.jpg')]);
  return {before,after,beforeUrl:original,afterUrl:result,description,roomType,versionId};
}

/** Same private upload service as Clara; never sends anything to a contractor. */
export async function persistDesignChatPhotos(context: DesignChatContext): Promise<{beforeFileId: string; afterFileId: string}> {
  const cache=context.uploadedIds ?? (context.uploadedIds={});
  const ids: string[]=[];
  for(const [index,file] of [context.before,context.after].entries()) {
    const key=index===0?'beforeFileId':'afterFileId';
    if(cache[key]) {ids.push(cache[key]);continue;}
    const upload=await uploadAlexFile(file,{requireRecord:true});
    if(!upload.ok || !upload.file || upload.file.isGuest)throw new Error('Connectez-vous pour joindre vos photos à votre demande.');
    cache[key]=upload.file.id;
    ids.push(upload.file.id);
  }
  return {beforeFileId:ids[0],afterFileId:ids[1]};
}
