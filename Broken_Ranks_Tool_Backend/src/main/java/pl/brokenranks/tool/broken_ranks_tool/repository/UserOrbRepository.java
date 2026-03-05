package pl.brokenranks.tool.broken_ranks_tool.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.brokenranks.tool.broken_ranks_tool.entity.user.UserOrb;

@Repository
public interface UserOrbRepository extends JpaRepository<UserOrb, Long> {
}
