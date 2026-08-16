import {redirect} from "next/navigation";
import {AtendimentoApp} from "@/components/atendimento-app";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getPermissionContext} from "@/lib/auth/permissions";

export default async function DashboardPage(){
 const supabase=await createClient();if(!supabase)redirect("/login?error=config");
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:profile,error}=await supabase.from("profiles").select("full_name,role,active").eq("id",user.id).maybeSingle();
 if(error||!profile){await supabase.auth.signOut();redirect("/login?error=profile")}
 if(!profile.active){await supabase.auth.signOut();redirect("/login?error=inactive")}
 const access=await getPermissionContext();if(!access){await supabase.auth.signOut();redirect("/login?error=inactive")}
 const admin=createAdminClient();if(admin)await admin.from("profiles").update({last_login_at:new Date().toISOString()}).eq("id",user.id);
 const {data:sales}=await supabase.from("profiles").select("can_sell,can_discount,can_cancel_sale").eq("id",user.id).maybeSingle();
 return <AtendimentoApp user={{email:user.email??"",fullName:profile.full_name??user.email??"Usuário",role:access.role,permissions:access.permissions,canSell:sales?.can_sell??false,canDiscount:sales?.can_discount??false,canCancelSale:sales?.can_cancel_sale??false}}/>;
}
