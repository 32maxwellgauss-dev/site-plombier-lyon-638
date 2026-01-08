
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event, context) => {
const origin = event.headers.origin || event.headers.Origin;

const headers = {
    'Access-Control-Allow-Origin': origin, 
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  
  try {
    const data = JSON.parse(event.body);
    
    if (data.bambou && data.bambou.length > 0) {
        console.log("Blck");
        return { statusCode: 200, headers, body: JSON.stringify({success: true}) };
    }

    
    
    const { name, email, phone, message, subject } = data;

    const name = escapeHtml(data.name);
    const email = escapeHtml(data.email);
    const phone = escapeHtml(data.phone);
    const message = escapeHtml(data.message);
    const subject = escapeHtml(data.subject);


    if (message.length > 2000) {
        return { statusCode: 400, headers, body: JSON.stringify({error: "Message trop long (max 2000 caractères)"}) };
    }
    
    const emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/;
    if (!emailRegex.test(email)) {
        return { statusCode: 400, headers, body: JSON.stringify({error: "Adresse email invalide"}) };
    }
    
    const { error: dbError } = await supabase.from('leads').insert([{ 
        client_id: process.env.CLIENT_ID, 
        name, email, phone, message, subject 
    }]);

    if (dbError) {
        console.error("Erreur DB:", dbError);
        throw new Error("Erreur de sauvegarde");
    }

    if(process.env.CLIENT_EMAIL) {
        await resend.emails.send({
          from: 'Nouveau Lead <onboarding@resend.dev>',
          to: [process.env.CLIENT_EMAIL],
          reply_to: email,
          subject: 'Nouveau contact : ' + (subject || 'Site Web'),
          html: `
            <h2>Nouveau message reçu !</h2>
            <p><strong>Nom :</strong> ${name}</p>
            <p><strong>Email :</strong> ${email}</p>
            <p><strong>Téléphone :</strong> ${phone}</p>
            <hr />
            <p><strong>Message :</strong></p>
            <p>${escapeHtml(message)}</p>
            <br/>
            <small>Ce lead est sauvegardé dans votre base de données.</small>
          `
        });
    }

    return { statusCode: 200, headers, body: JSON.stringify({success: true}) };
  } catch (error) {
    console.error("Erreur:", error);
    return { statusCode: 500, headers, body: JSON.stringify({error: error.message}) };
  }
};
