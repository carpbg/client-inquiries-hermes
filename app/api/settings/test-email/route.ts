import { sendTestEmail } from "../../../../lib/notifications";
import { requireAccess } from "../../../../lib/auth";
export async function POST(request:Request){const unauthorized=await requireAccess(request,["admin"]);if(unauthorized)return unauthorized;try{const {to}=await request.json() as {to?:string};if(!to?.includes("@"))return Response.json({error:"Въведете валиден имейл за теста."},{status:400});await sendTestEmail(to);return Response.json({ok:true})}catch(error){return Response.json({error:error instanceof Error?error.message:"Тестът е неуспешен."},{status:500})}}
