package com.danphe.emr;

import com.danphe.emr.model.User;
import com.danphe.emr.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class DanpheEmrApplication {

	public static void main(String[] args) {
		SpringApplication.run(DanpheEmrApplication.class, args);
	}

	@Bean
	CommandLineRunner init(UserRepository userRepository,
			com.danphe.emr.repository.EmployeeRepository employeeRepository) {
		return args -> {
			// 1. Ensure Admin Employee exists
			if (employeeRepository.findById(1).isEmpty()) {
				com.danphe.emr.model.Employee adminEmp = new com.danphe.emr.model.Employee();
				adminEmp.setFirstName("System");
				adminEmp.setLastName("Admin");
				adminEmp.setRole("Admin");
				adminEmp.setDepartment("Administration");
				adminEmp.setStatus("Active");
				adminEmp.setIsActive(true);
				employeeRepository.save(adminEmp);
				System.out.println("Admin Employee seeded.");
			}

			// 2. Ensure Admin User exists and is forced to correct state
			userRepository.findByUserName("admin").ifPresentOrElse(
					admin -> {
						admin.setPassword("pass1");
						admin.setEmployeeId(1);
						userRepository.save(admin);
						System.out.println("Admin credentials updated: admin/pass1");
					},
					() -> {
						User admin = new User();
						admin.setUserName("admin");
						admin.setPassword("pass1");
						admin.setEmployeeId(1);
						admin.setIsActive(true);
						userRepository.save(admin);
						System.out.println("New Admin user seeded: admin/pass1");
					});
		};
	}
}
