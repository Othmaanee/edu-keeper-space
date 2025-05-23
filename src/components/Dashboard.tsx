
import { useState, useEffect } from 'react';
import { Upload, CheckCircle, FileText, Lightbulb, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { CategoryCard } from './CategoryCard';
import { RecentDocuments } from './RecentDocuments';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { UserLevel } from './UserLevel';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface DashboardProps {
  onSubscribeInterest?: (message: string) => Promise<void>;
}

export function Dashboard({ onSubscribeInterest }: DashboardProps) {
  const [userName, setUserName] = useState<string | null>(null);
  const [lastUpdateDate, setLastUpdateDate] = useState<Date | null>(null);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Récupérer les informations de l'utilisateur connecté
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Utilisateur non connecté");
      }
      
      // Récupérer les informations complètes de l'utilisateur
      const { data, error } = await supabase
        .from('users')
        .select('prenom, nom, xp, level, skin')
        .eq('id', session.user.id)
        .single();
        
      if (error) throw error;
      
      return data;
    }
  });

  // Récupérer les catégories et le nombre de documents associés
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      // Récupérer toutes les catégories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, nom');
      
      if (categoriesError) throw categoriesError;
      
      // Pour chaque catégorie, compter le nombre de documents associés
      const categoriesWithCount = await Promise.all(
        categoriesData.map(async (category) => {
          const { count, error: countError } = await supabase
            .from('documents')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', category.id);
          
          if (countError) throw countError;
          
          return {
            id: category.id,
            name: category.nom,
            count: count || 0,
            color: getRandomColor(category.id) // Fonction pour attribuer une couleur en fonction de l'ID
          };
        })
      );
      
      return categoriesWithCount;
    }
  });

  // Récupérer la date du document le plus récent
  const { data: latestDocument } = useQuery({
    queryKey: ['latestDocument'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      
      if (data) {
        setLastUpdateDate(new Date(data.created_at));
      }
      
      return data;
    }
  });

  // Fonction pour attribuer une couleur en fonction de l'ID de la catégorie
  const getRandomColor = (id: string): string => {
    const colors = ['blue', 'green', 'amber', 'purple', 'rose'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Formater la date en français
  const formatDateFr = (date: Date | null): string => {
    if (!date) return "Aucune mise à jour";
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Mettre à jour le nom d'utilisateur lorsque les données sont chargées
  useEffect(() => {
    if (userData) {
      setUserName(userData.prenom || userData.nom);
    }
  }, [userData]);

  const isLoading = userLoading || categoriesLoading;

  // Récupérer le skin de l'utilisateur et l'appliquer à la page
  useEffect(() => {
    if (userData?.skin) {
      document.documentElement.classList.remove('skin-base', 'skin-avance', 'skin-pro', 'skin-expert', 'skin-maitre');
      document.documentElement.classList.add(`skin-${userData.skin}`);
    }
  }, [userData?.skin]);

  // URL du formulaire Google Forms
  const subscriptionFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdw_yRI9VGfH7UpCA-7_2zBwzlKUWg_MRLWufSWWLYRokXtQw/viewform";

  const handleSubscribeClick = () => {
    // Ouvrir l'URL dans une nouvelle fenêtre/onglet
    window.open(subscriptionFormUrl, '_blank');
  };

  const handleContactClick = () => {
    setContactDialogOpen(true);
    setSubscribeDialogOpen(false);
  };

  const handleSendContactMessage = async () => {
    setIsSubmitting(true);
    try {
      if (onSubscribeInterest) {
        await onSubscribeInterest(contactMessage || "Intérêt pour l'abonnement EduKeeper");
      }
      setContactDialogOpen(false);
      setContactMessage("");
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cette fonction n'est plus utilisée maintenant que nous redirigeons vers Google Forms
  const handleSubscribeInterest = async () => {
    setIsSubmitting(true);
    try {
      if (onSubscribeInterest) {
        await onSubscribeInterest("Demande d'abonnement depuis le bouton principal");
      }
      setSubscribeDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'envoi de la demande d'abonnement:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Instruction message */}
      <Alert className="bg-primary/5 border-primary/20">
        <Lightbulb className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground font-medium">
          Déposez un document, cliquez sur un bouton IA et récupérez votre cours ou résumé sans effort.
        </AlertDescription>
      </Alert>
      
      {/* Mini walkthrough visuel */}
      <div className="bg-muted rounded-lg p-4 flex items-center justify-center">
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="font-semibold">🧭</span>
          <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">1. Déposez un doc</span>
          <span className="text-muted-foreground hidden sm:inline">—</span>
          <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">2. Cliquez sur un bouton IA</span>
          <span className="text-muted-foreground hidden sm:inline">—</span>
          <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">3. Récupérez votre synthèse</span>
        </div>
      </div>
      
      {/* Subscribe Button - Updated text */}
      <div className="flex justify-center">
        <Button 
          onClick={handleSubscribeClick}
          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-medium py-2 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          disabled={isSubmitting}
        >
          <Zap className="h-5 w-5" />
          Faire un retour sur EduKeeper
        </Button>
      </div>
      
      {/* Welcome Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/80 to-primary p-6 md:p-8 text-white">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {isLoading ? (
              <div className="flex items-center">
                <span>Bonjour</span>
                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>Bonjour, {userName || "utilisateur"}</>
            )}
          </h1>
          
          {/* User Level and XP */}
          <div className="mt-4 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <UserLevel />
          </div>
          
          <p className="mt-4 text-white/90 max-w-xl">
            Bienvenue dans votre espace de ressources éducatives. Vous pouvez organiser, consulter et partager tous vos documents pédagogiques.
          </p>
          
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="bg-white text-primary hover:bg-white/90">
              <Link to="/upload">
                <Upload className="h-4 w-4 mr-2" />
                Importer des documents
              </Link>
            </Button>
            <Button asChild variant="ghost" className="bg-white/20 hover:bg-white/30 text-white">
              <Link to="/documents">
                Explorer mes ressources
              </Link>
            </Button>
          </div>
          
          <div className="mt-6 flex items-center text-sm text-white/90">
            <CheckCircle className="h-4 w-4 mr-2" />
            <span>
              {isLoading ? (
                <div className="flex items-center">
                  <span>Chargement des informations</span>
                  <Loader2 className="ml-2 h-3 w-3 animate-spin" />
                </div>
              ) : (
                <>Dernière mise à jour : {formatDateFr(lastUpdateDate)}</>
              )}
            </span>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/20 to-transparent" />
        <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -top-6 right-12 h-20 w-20 rounded-full bg-white/10" />
      </section>
      
      {/* Categories Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Catégories</h2>
          <Link 
            to="/categories"
            className="text-sm font-medium text-primary hover:underline"
          >
            Voir toutes
          </Link>
        </div>
        
        {categoriesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <CategoryCard 
                key={category.id}
                id={category.id}
                name={category.name}
                count={category.count}
                color={category.color}
                className="animate-scale-in"
                onDelete={() => refetchCategories()}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">Aucune catégorie disponible</h3>
            <p className="mt-1 text-sm text-muted-foreground mb-6">
              Commencez par créer des catégories pour organiser vos documents.
            </p>
            <CreateCategoryDialog onCategoryCreated={() => refetchCategories()} />
          </div>
        )}
      </section>
      
      {/* Recent Documents Section */}
      <RecentDocuments />
      
      {/* Subscription Dialog */}
      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Abonnement EduKeeper
            </DialogTitle>
            <DialogDescription>
              Merci pour votre intérêt ! Cette fonctionnalité sera bientôt disponible.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-center">
              Nous préparons des offres d'abonnement adaptées à vos besoins. Vous serez parmi les premiers informés lorsque cette fonctionnalité sera disponible.
            </p>
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleContactClick}
                variant="link"
                className="inline-flex items-center gap-2 text-primary"
              >
                <span>Me contacter quand c'est prêt</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Laissez-nous vos coordonnées</DialogTitle>
            <DialogDescription>
              Nous vous contacterons dès que l'abonnement sera disponible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message (optionnel)</Label>
              <Textarea
                id="contact-message"
                placeholder="Dites-nous ce qui vous intéresse dans l'abonnement..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleSendContactMessage}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                "Envoyer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
