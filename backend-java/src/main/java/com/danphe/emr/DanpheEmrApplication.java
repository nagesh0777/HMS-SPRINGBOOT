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
			com.danphe.emr.repository.EmployeeRepository employeeRepository,
			com.danphe.emr.repository.HospitalRepository hospitalRepository) {
		return args -> {

			// 1. Seed Default Hospital
			if (hospitalRepository.count() == 0) {
				com.danphe.emr.model.Hospital h = new com.danphe.emr.model.Hospital();
				h.setName("Trikaar HQ");
				h.setAddress("Tech Park");
				h.setIsActive(true);
				hospitalRepository.save(h);
				System.out.println("Default Hospital seeded.");
			}

			// 2. Seed Super Admin (Trikaar)
			if (employeeRepository.findByUserName("trikaar_admin").isEmpty()) {
				// Create Employee
				com.danphe.emr.model.Employee superEmp = new com.danphe.emr.model.Employee();
				superEmp.setFirstName("Super");
				superEmp.setLastName("Admin");
				superEmp.setRole("SuperAdmin");
				superEmp.setAccessLevel("SuperAdmin");
				superEmp.setUserName("trikaar_admin");
				superEmp.setPhoneNumber("9800000000");
				superEmp.setIsActive(true);
				superEmp.setHospitalId(1); // Belongs to Trikaar HQ
				com.danphe.emr.model.Employee savedSuper = employeeRepository.save(superEmp);

				// Create User
				User superUser = new User();
				superUser.setUserName("trikaar_admin");
				superUser.setPassword("trikaar_root");
				superUser.setEmployeeId(savedSuper.getEmployeeId());
				superUser.setHospitalId(1);
				superUser.setIsActive(true);
				userRepository.save(superUser);
				System.out.println("Super Admin seeded: trikaar_admin/root");
			}

			// 3. Ensure Regular Admin Exists (Legacy support)
			if (employeeRepository.findById(1).isEmpty()) {
				com.danphe.emr.model.Employee adminEmp = new com.danphe.emr.model.Employee();
				adminEmp.setFirstName("System");
				adminEmp.setLastName("Admin");
				adminEmp.setRole("Admin");
				adminEmp.setDepartment("Administration");
				adminEmp.setStatus("Active");
				adminEmp.setPhoneNumber("9811111111");
				adminEmp.setIsActive(true);
				adminEmp.setHospitalId(1); // Default to HQ for now
				employeeRepository.save(adminEmp);
				System.out.println("Admin Employee seeded.");
			}

			// 4. Ensure Admin User exists
			userRepository.findByUserName("admin").ifPresentOrElse(
					admin -> {
						admin.setPassword("pass123");
						admin.setEmployeeId(1);
						admin.setHospitalId(1);
						userRepository.save(admin);
						System.out.println("Admin user updated.");
					},
					() -> {
						User admin = new User();
						admin.setUserName("admin");
						admin.setPassword("pass123");
						admin.setEmployeeId(1);
						admin.setHospitalId(1);
						admin.setIsActive(true);
						userRepository.save(admin);
						System.out.println("New Admin user seeded: admin/pass1");
					});
		};
	}
}
