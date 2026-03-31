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

interface SubtaskAssignedEmailProps {
  assigneeName: string;
  subtaskTitle: string;
  subtaskId: string;
  assignedBy: string;
  appUrl: string;
}

export default function SubtaskAssignedEmail({
  assigneeName,
  subtaskTitle,
  subtaskId,
  assignedBy,
  appUrl,
}: SubtaskAssignedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {assignedBy} assigned you to {subtaskId}: {subtaskTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>You&apos;ve been assigned a subtask</Text>
          <Text style={paragraph}>Hi {assigneeName},</Text>
          <Text style={paragraph}>
            <strong>{assignedBy}</strong> assigned you to{" "}
            <strong>
              {subtaskId}: {subtaskTitle}
            </strong>
            .
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={`${appUrl}/subtasks/${subtaskId}`}>
              View Subtask
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

SubtaskAssignedEmail.PreviewProps = {
  assigneeName: "Jane",
  subtaskTitle: "Write unit tests",
  subtaskId: "ST-8",
  assignedBy: "John",
  appUrl: "http://localhost:3000",
} satisfies SubtaskAssignedEmailProps;
