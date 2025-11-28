import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors
let resend: Resend | null = null;

function getResendClient() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function POST(request: Request) {
  try {
    const { to, subject, html, text } = await request.json();

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: 'BASE <onboarding@resend.dev>', // Используем тестовый домен Resend
      to: [to],
      subject: subject,
      html: html || undefined,
      text: text || undefined,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: error.message, status: 'error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      status: 'success',
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', status: 'error' },
      { status: 500 }
    );
  }
}

