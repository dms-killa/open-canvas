export async function validateOllamaConnection(): Promise<boolean> {
  const baseUrl = process.env.OLLAMA_API_URL || "http://localhost:11434";

  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama not responding: ${response.status}`);
    }

    const data = await response.json();
    const modelNames = data.models?.map(
      (m: { name: string }) => m.name
    );
    console.log(
      `Ollama connected. Available models: ${modelNames?.join(", ") || "none"}`
    );
    return true;
  } catch (error: any) {
    console.error(`Ollama connection failed: ${error.message}`);
    console.error(
      "  Make sure Ollama is running: docker-compose up ollama"
    );
    return false;
  }
}
