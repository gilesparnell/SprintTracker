import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Text,
  Button,
  Section,
} from "@react-email/components";

interface NoteAddedEmailProps {
  recipientName: string;
  entityTitle: string;
  entityId: string;
  authorName: string;
  notePreview: string;
  appUrl: string;
}

export default function NoteAddedEmail({
  recipientName,
  entityTitle,
  entityId,
  authorName,
  notePreview,
  appUrl,
}: NoteAddedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {authorName} added a note on {entityId}: {entityTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>New note on your task</Text>
          <Text style={paragraph}>Hi {recipientName},</Text>
          <Text style={paragraph}>
            <strong>{authorName}</strong> added a note on{" "}
            <strong>
              {entityId}: {entityTitle}
            </strong>
            :
          </Text>
          <Section style={quoteBlock}>
            <Text style={quoteText}>{notePreview}</Text>
          </Section>
          <Section style={buttonContainer}>
            <Button style={button} href={`${appUrl}/tasks/${entityId}`}>
              View Task
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px",
  borderRadius: "8px",
  maxWidth: "560px",
};

const heading = {
  fontSize: "20px",
  fontWeight: "600" as const,
  color: "#1a1a1a",
  marginBottom: "16px",
};

const paragraph = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#4a4a4a",
};

const quoteBlock = {
  backgroundColor: "#f0f0f0",
  borderLeft: "3px solid #d1d5db",
  padding: "12px 16px",
  borderRadius: "4px",
  margin: "16px 0",
};

const quoteText = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "0",
  fontStyle: "italic" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  marginTop: "24px",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
  padding: "10px 24px",
  display: "inline-block",
};

NoteAddedEmail.PreviewProps = {
  recipientName: "Jane",
  entityTitle: "Fix login bug",
  entityId: "T-5",
  authorName: "John",
  notePreview: "I think the issue is related to the session token expiring...",
  appUrl: "http://localhost:3000",
} satisfies NoteAddedEmailProps;
