import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { company } from "@/lib/company";

export const metadata: Metadata = { title: "Termos de Uso", description: "Termos de Uso do site, sistema e canais digitais da CIASSTEC.", alternates: { canonical: "/termos" } };

export default function TermsPage() {
  return <LegalPage eyebrow="Condições de utilização" title="Termos de Uso" intro="Estes termos apresentam regras básicas para utilização do site institucional, do atendimento, do sistema e dos canais digitais da CIASSTEC.">
    <p className="legal-updated">Última atualização: agosto de 2026.</p>
    <h2>1. Aceitação e finalidade</h2>
    <p>Ao utilizar o site ou iniciar contato pelos canais disponibilizados, o usuário declara estar ciente destes termos. O site apresenta informações institucionais e meios de contato. O sistema de atendimento apoia atividades relacionadas aos serviços da CIASSTEC.</p>
    <h2>2. Uso adequado</h2>
    <p>O usuário deve fornecer informações verdadeiras e utilizar os canais de forma lícita, respeitosa e compatível com sua finalidade. Não é permitido tentar acessar contas de terceiros, contornar mecanismos de segurança, interferir no funcionamento do sistema ou utilizar os canais para conteúdo ilícito.</p>
    <h2>3. Acesso ao sistema</h2>
    <p>Áreas restritas exigem credenciais válidas. O usuário é responsável por manter suas credenciais sob sigilo e informar a CIASSTEC caso suspeite de uso não autorizado. O acesso poderá ser limitado quando necessário para preservar a segurança e o funcionamento do serviço.</p>
    <h2>4. Informações e atendimento</h2>
    <p>As informações do site têm caráter institucional. Diagnósticos, orçamentos, condições de execução e demais detalhes de cada atendimento dependem da avaliação do caso e das comunicações realizadas com o cliente. Este documento não estabelece garantias, preços, prazos ou condições comerciais específicas.</p>
    <h2>5. Equipamentos e dados fornecidos</h2>
    <p>O cliente deve informar corretamente as características e condições relevantes do equipamento. Recomenda-se manter cópia de segurança de dados importantes antes de disponibilizar equipamentos para análise ou serviço, quando isso for possível.</p>
    <h2>6. Disponibilidade dos canais</h2>
    <p>A CIASSTEC busca manter seus canais acessíveis, mas pode haver indisponibilidades temporárias decorrentes de manutenção, atualizações ou serviços de terceiros. Mensagens enviadas não significam confirmação automática de atendimento ou de condições comerciais.</p>
    <h2>7. Propriedade e conteúdo</h2>
    <p>Textos, organização visual e demais conteúdos próprios do site destinam-se à apresentação da CIASSTEC e não devem ser reproduzidos para fins indevidos. Marcas e serviços de terceiros pertencem aos seus respectivos titulares.</p>
    <h2>8. Privacidade</h2>
    <p>O tratamento de dados pessoais relacionado ao uso do site e dos canais de atendimento é explicado na <a href="/politica-de-privacidade">Política de Privacidade</a>.</p>
    <h2>9. Alterações e contato</h2>
    <p>Estes termos poderão ser atualizados quando necessário. Para dúvidas, entre em contato pelo e-mail <a href={`mailto:${company.primaryEmail}`}>{company.primaryEmail}</a>.</p>
  </LegalPage>;
}
