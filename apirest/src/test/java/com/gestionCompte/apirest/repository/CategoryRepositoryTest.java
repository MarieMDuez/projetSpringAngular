package com.gestionCompte.apirest.repository;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import com.gestionCompte.apirest.model.Category;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class CategoryRepositoryTest {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TestEntityManager entityManager;
    
    @Test
    public void should_return_only_active_categories() {
        // Given : On génère un libellé unique pour ne pas se mélanger avec votre historique BDD
        String uniqueLabelActive = "Catégorie Test Active Unique";
        String uniqueLabelInactive = "Catégorie Test Inactive Unique";

        Category activeCat = new Category();
        activeCat.setLabel(uniqueLabelActive);
        activeCat.setActive(true);
        entityManager.persist(activeCat);

        Category inactiveCat = new Category();
        inactiveCat.setLabel(uniqueLabelInactive);
        inactiveCat.setActive(false);
        entityManager.persist(inactiveCat);

        entityManager.flush();

        // When : Récupération de toutes les catégories actives de la BDD
        List<Category> activeCategories = categoryRepository.findByIsActiveTrue();

        // Then : On extrait les noms pour vérifier la présence/absence
        boolean activeFound = false;
        boolean inactiveFound = false;

        for (Category cat : activeCategories) {
            if (cat.getLabel().equals(uniqueLabelActive)) activeFound = true;
            if (cat.getLabel().equals(uniqueLabelInactive)) inactiveFound = true;
        }

        // Si la catégorie active est introuvable, ou si l'inactive s'est glissée dans le flux : CRASH
        if (!activeFound || inactiveFound) {
            throw new AssertionError("Échec : Le filtrage par statut actif ne fonctionne pas correctement !");
        }
    }

}
