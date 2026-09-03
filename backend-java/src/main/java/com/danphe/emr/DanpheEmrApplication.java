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
			com.danphe.emr.repository.HospitalRepository hospitalRepository,
			org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
		return args -> {

			// 1. Seed Default Hospital
			if (hospitalRepository.count() == 0) {
				com.danphe.emr.model.Hospital h = new com.danphe.emr.model.Hospital();
				h.setName("Trikaar Owner HQ");
				h.setAddress("Tech Park");
				h.setIsActive(true);
				hospitalRepository.save(h);
				System.out.println("Default Hospital seeded.");
			} else {
				hospitalRepository.findById(1).ifPresent(h -> {
					if ("Trikaar HQ".equalsIgnoreCase(h.getName()) || "TrikaarHQ".equalsIgnoreCase(h.getName())) {
						h.setName("Trikaar Owner HQ");
						hospitalRepository.save(h);
						System.out.println("Default Hospital renamed to Trikaar Owner HQ.");
					}
				});
			}

			// 2. Seed Owner Super Admin (Nagesh)
			if (employeeRepository.findByUserName("nagesh").isEmpty()) {
				// Create Employee
				com.danphe.emr.model.Employee superEmp = new com.danphe.emr.model.Employee();
				superEmp.setFirstName("Nagesh");
				superEmp.setLastName("Owner");
				superEmp.setRole("SuperAdmin");
				superEmp.setAccessLevel("SuperAdmin");
				superEmp.setUserName("nagesh");
				superEmp.setPhoneNumber("9800000000");
				superEmp.setIsActive(true);
				superEmp.setHospitalId(1); // Belongs to the owner HQ hospital
				com.danphe.emr.model.Employee savedSuper = employeeRepository.save(superEmp);

				// Create User
				User superUser = new User();
				superUser.setUserName("nagesh");
				superUser.setPassword(passwordEncoder.encode("nagesh@01"));
				superUser.setEmployeeId(savedSuper.getEmployeeId());
				superUser.setHospitalId(1);
				superUser.setIsActive(true);
				userRepository.save(superUser);
				System.out.println("Owner Super Admin seeded: nagesh");
			} else {
				userRepository.findByUserName("nagesh").ifPresent(owner -> {
					owner.setPassword(passwordEncoder.encode("nagesh@01"));
					owner.setIsActive(true);
					userRepository.save(owner);
					System.out.println("Owner Super Admin credentials refreshed: nagesh");
				});
			}

			userRepository.findByUserName("trikaar_admin").ifPresent(legacy -> {
				legacy.setIsActive(false);
				userRepository.save(legacy);
				System.out.println("Legacy Super Admin disabled: trikaar_admin");
			});
			employeeRepository.findByUserName("trikaar_admin").ifPresent(legacyEmp -> {
				legacyEmp.setIsActive(false);
				legacyEmp.setStatus("Inactive");
				employeeRepository.save(legacyEmp);
			});

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
				adminEmp.setHospitalId(1); // Default to owner HQ for now
				employeeRepository.save(adminEmp);
				System.out.println("Admin Employee seeded.");
			}

			// 4. Ensure the admin user exists.
			//
			// This previously reset the password to a hardcoded value on EVERY boot, so changing
			// it never stuck — a restart put it back. "admin" is also one of the usernames
			// SecurityUtil.isSuperAdmin() grants platform-wide access to, so that was a known
			// credential for the highest-privilege account, restored on every deploy.
			//
			// Now: the password is only ever set when the account is first created, comes from
			// the environment, and an existing account is left alone.
			String seedPassword = System.getenv("ADMIN_SEED_PASSWORD");
			userRepository.findByUserName("admin").ifPresentOrElse(
					admin -> {
						// Deliberately does not touch the password of an account that already exists.
						boolean changed = false;
						if (admin.getEmployeeId() == null) { admin.setEmployeeId(1); changed = true; }
						if (admin.getHospitalId() == null) { admin.setHospitalId(1); changed = true; }
						if (changed) userRepository.save(admin);
					},
					() -> {
						if (seedPassword == null || seedPassword.length() < 8) {
							System.out.println(
									"No admin user, and ADMIN_SEED_PASSWORD is unset or shorter than 8 characters — "
											+ "skipping admin creation. Set it and restart to create the account.");
							return;
						}
						User admin = new User();
						admin.setUserName("admin");
						admin.setPassword(passwordEncoder.encode(seedPassword));
						admin.setNeedsPasswordUpdate(true);
						admin.setEmployeeId(1);
						admin.setHospitalId(1);
						admin.setIsActive(true);
						userRepository.save(admin);
						System.out.println("Admin user created from ADMIN_SEED_PASSWORD. Change it at first sign-in.");
					});
		};
	}
}
