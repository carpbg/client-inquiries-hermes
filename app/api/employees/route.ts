import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { employees, inquiries, inquiryEmployees } from "../../../db/schema";
import { or } from "drizzle-orm";
import { getAuthorizedUser, requireAccess, requireUser } from "../../../lib/auth";

async function ensureRoleUsers(){for(const person of [{firstName:"Елица",lastName:"Испорска",email:"eisporska@technologica.com",systemRole:"contract_manager"},{firstName:"Петя",lastName:"Димитрова",email:"pdimitrova@technologica.com",systemRole:"department_head"}]){const [found]=await getDb().select().from(employees).where(eq(employees.email,person.email)).limit(1);if(found)await getDb().update(employees).set({firstName:person.firstName,lastName:person.lastName,systemRole:person.systemRole,active:true}).where(eq(employees.id,found.id));else await getDb().insert(employees).values(person)}await getDb().update(employees).set({accessRole:"admin",active:true}).where(eq(employees.email,"mdoychinov@technologica.com"));}
export async function GET(request: Request) { const unauthorized = await requireUser(request); if (unauthorized) return unauthorized; await ensureRoleUsers(); return Response.json({ employees: await getDb().select().from(employees).orderBy(asc(employees.lastName), asc(employees.firstName)) }); }
export async function POST(request: Request) {
  const unauthorized = await requireAccess(request,["admin"]); if (unauthorized) return unauthorized;
  const p=await request.json() as {firstName?:string;lastName?:string;email?:string;systemRole?:string}; if(!p.firstName?.trim()||!p.lastName?.trim()||!p.email?.includes("@")) return Response.json({error:"Двете имена и валиден имейл са задължителни."},{status:400});
  const [created]=await getDb().insert(employees).values({firstName:p.firstName.trim(),lastName:p.lastName.trim(),email:p.email.trim().toLowerCase(),systemRole:p.systemRole??"",accessRole:"user"}).returning(); return Response.json({employee:created},{status:201});
}
export async function PUT(request: Request) {
  const unauthorized = await requireAccess(request,["admin"]); if (unauthorized) return unauthorized;
  const user=await getAuthorizedUser(request);
  const p=await request.json() as {id?:number;firstName?:string;lastName?:string;email?:string;active?:boolean;systemRole?:string;accessRole?:string}; if(!p.id)return Response.json({error:"Липсва служител."},{status:400});
  const [before]=await getDb().select().from(employees).where(eq(employees.id,p.id)).limit(1);if(!before)return Response.json({error:"Служителят не е намерен."},{status:404});
  if(user?.id===p.id&&(p.active===false||p.accessRole&&p.accessRole!=="admin"))return Response.json({error:"Не можете да премахнете собствените си администраторски права или да деактивирате профила си."},{status:400});
  if(before.accessRole==="admin"&&(p.active===false||p.accessRole&&p.accessRole!=="admin")){const admins=(await getDb().select().from(employees)).filter(x=>x.active&&x.accessRole==="admin");if(admins.length<=1)return Response.json({error:"Трябва да остане поне един активен администратор."},{status:400});}
  const accessRole=p.accessRole&&["user","manager","admin"].includes(p.accessRole)?p.accessRole:undefined;
  const [updated]=await getDb().update(employees).set({...(p.firstName?.trim()?{firstName:p.firstName.trim()}:{}),...(p.lastName?.trim()?{lastName:p.lastName.trim()}:{}),...(p.email?.trim()?{email:p.email.trim().toLowerCase()}:{}),...(typeof p.active==="boolean"?{active:p.active}:{}),...(typeof p.systemRole==="string"?{systemRole:p.systemRole}:{}),...(accessRole?{accessRole}:{})}).where(eq(employees.id,p.id)).returning(); return Response.json({employee:updated});
}
export async function DELETE(request: Request) {
  const unauthorized = await requireAccess(request,["admin"]); if (unauthorized) return unauthorized;
  const id=Number(new URL(request.url).searchParams.get("id")); if(!id)return Response.json({error:"Липсва служител."},{status:400});
  const roleUse=await getDb().select({id:inquiries.id}).from(inquiries).where(or(eq(inquiries.recipientEmployeeId,id),eq(inquiries.analystEmployeeId,id),eq(inquiries.projectManagerEmployeeId,id))).limit(1);
  const stakeholderUse=await getDb().select({id:inquiryEmployees.inquiryId}).from(inquiryEmployees).where(eq(inquiryEmployees.employeeId,id)).limit(1);
  if(roleUse.length||stakeholderUse.length)return Response.json({error:"Служителят се използва в заявка. Деактивирайте го, за да запазите историята."},{status:409});
  await getDb().delete(employees).where(eq(employees.id,id)); return Response.json({ok:true});
}
