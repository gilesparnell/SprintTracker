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

interface TaskAssignedEmailProps {
  assigneeName: string;
  taskTitle: string;
  taskId: string;
  assignedBy: string;
  appUrl: string;
}

export default function TaskAssignedEmail({
  assigneeName,
  taskTitle,
  taskId,
  assignedBy,
  appUrl,
}: TaskAssignedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {assignedBy} assigned you to {taskId}: {taskTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>You&apos;ve been assigned a task</Text>
          <Text style={paragraph}>Hi {assigneeName},</Text>
          <Text style={paragraph}>
            <strong>{assignedBy}</strong> assigned you to{" "}
            <strong>
              {taskId}: {taskTitle}
            </strong>
            .
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={`${appUrl}/tasks/${taskId}`}>
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

TaskAssignedEmail.PreviewProps = {
  assigneeName: "Jane",
  taskTitle: "Fix login bug",
  taskId: "T-5",
  assignedBy: "John",
  appUrl: "http://localhost:3000",
} satisfies TaskAssignedEmailProps;
