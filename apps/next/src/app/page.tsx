import styles from "./page.module.css";
import { Sprite } from "../Sprite";
import { Container, Grid } from "@radix-ui/themes";

export default function Home() {
  return (
    <Container style={{ background: "var(--gray-a2)" }}>
      <Grid
        gap="3"
        rows="20px 1fr 20px"
        align="center"
        justify="center"
        minHeight={"100svh"}
        style={{ background: "white" }}
        p={{ initial: "3", md: "6" }}
      >
        <main className={styles.main}>
          <Sprite />
        </main>
      </Grid>
    </Container>
  );
}
