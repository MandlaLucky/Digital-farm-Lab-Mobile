import { createHash } from 'crypto';
export class MockPassportClient {
  async issueCredential(req:{userId:string;credentialType:string;payload:any}) {
    const s = req.userId + '|' + req.credentialType;
    const h = createHash('sha1').update(s).digest('hex');
    const id = h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20,32);
    return { credentialId:id, status:'MOCK_ISSUED', issuedAt:new Date() };
  }
}
export class MockAgriLearnClient {
  fetchModule(code:string) {
    const f:Record<string,any> = { 'LEARN-CROP-01':{code,title:'Irrigation scenario',description:'Reduce irrigation by 20%.',lessons:[],language:'en',source:'mock'} };
    return f[code] || null;
  }
}