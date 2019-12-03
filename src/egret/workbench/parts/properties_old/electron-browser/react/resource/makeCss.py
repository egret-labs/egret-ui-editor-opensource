import os
import os.path
rootdir = './light/component'

contents = [];
generCssFileNmae = 'test.css'
generCodeFileNmae = 'testCode.ts'

for parent,dirnames,filenames in os.walk(rootdir):
	for filename in filenames:
		print filename
		contents.append(filename)

cssTemplateStr = '''
.vs-dark .%s,
.hc-black .%s{
	background-image: url(\"light/component/%s\");
}

.vs .%s{
	background-image: url(\"dark/component/%s\");
}
'''

cssfobj = open(generCssFileNmae,'w')
cssfobj.writelines([cssTemplateStr % (eachline[:-4],eachline[:-4],eachline,eachline[:-4],eachline) for eachline in contents])
cssfobj.close()
print 'css done'

codeTemplateStr = '''\t public static %s:string=\'%s\';
'''
codeClsStartStr = '''export class PropertyResource { \n'''
codeClsEndStr = '''}\n'''
codefobj = open(generCodeFileNmae,'w')
codefobj.writelines(codeClsStartStr)
codefobj.writelines([codeTemplateStr % (eachline[:-4].upper(),eachline[:-4]) for eachline in contents])
codefobj.writelines(codeClsEndStr)
codefobj.close()
print 'code done'