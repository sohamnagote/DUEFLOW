package in.dueflow;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.File;

@SpringBootApplication
@EnableScheduling
public class DueFlowApplication {

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(DueFlowApplication.class, args);
    }

    private static void loadDotenv() {
        try {
            // Check current directory, parent directory, and workspace root
            File envFile = new File(".env");
            File parentEnvFile = new File("../.env");

            Dotenv dotenv = null;
            if (envFile.exists()) {
                dotenv = Dotenv.configure().directory(".").ignoreIfMissing().load();
            } else if (parentEnvFile.exists()) {
                dotenv = Dotenv.configure().directory("..").ignoreIfMissing().load();
            }

            if (dotenv != null) {
                dotenv.entries().forEach(entry -> {
                    if (System.getProperty(entry.getKey()) == null) {
                        System.setProperty(entry.getKey(), entry.getValue());
                    }
                });
            }
        } catch (Exception ignored) {}
    }
}
